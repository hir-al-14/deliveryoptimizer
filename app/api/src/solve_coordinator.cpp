#include "deliveryoptimizer/api/solve_coordinator.hpp"

#include <utility>

namespace {

[[nodiscard]] deliveryoptimizer::api::CoordinatedSolveResult
ToCoordinatedSolveResult(const deliveryoptimizer::api::VroomRunResult& result) {
  switch (result.status) {
  case deliveryoptimizer::api::VroomRunStatus::kSuccess:
    return deliveryoptimizer::api::CoordinatedSolveResult{
        .status = deliveryoptimizer::api::CoordinatedSolveStatus::kSucceeded,
        .output = result.output,
    };
  case deliveryoptimizer::api::VroomRunStatus::kTimedOut:
    return deliveryoptimizer::api::CoordinatedSolveResult{
        .status = deliveryoptimizer::api::CoordinatedSolveStatus::kTimedOut,
        .output = std::nullopt,
    };
  case deliveryoptimizer::api::VroomRunStatus::kFailed:
    break;
  }

  return deliveryoptimizer::api::CoordinatedSolveResult{
      .status = deliveryoptimizer::api::CoordinatedSolveStatus::kFailed,
      .output = std::nullopt,
  };
}

} // namespace

namespace deliveryoptimizer::api {

SolveCoordinator::SolveCoordinator(SolveAdmissionConfig config,
                                   std::shared_ptr<const VroomRunner> runner)
    : config_(std::move(config)), runner_(std::move(runner)) {
  workers_.reserve(config_.max_concurrency);
  for (std::size_t index = 0U; index < config_.max_concurrency; ++index) {
    workers_.emplace_back([this] { WorkerLoop(); });
  }
  queue_timer_ = std::jthread([this] { QueueTimerLoop(); });
}

SolveCoordinator::~SolveCoordinator() {
  std::deque<QueuedSolveRequest> drained_queue;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    shutting_down_ = true;
    drained_queue = std::move(queue_);
  }
  condition_.notify_all();

  for (auto& queued_request : drained_queue) {
    queued_request.callback(CoordinatedSolveResult{
        .status = CoordinatedSolveStatus::kFailed,
        .output = std::nullopt,
    });
  }
}

SolveAdmissionStatus SolveCoordinator::Submit(const SolveRequestSize& request_size,
                                              Json::Value input_payload,
                                              CompletionCallback callback) {
  std::lock_guard<std::mutex> lock(mutex_);
  if (shutting_down_) {
    return SolveAdmissionStatus::kRejectedQueueFull;
  }

  const SolveAdmissionStatus admission_status =
      EvaluateSolveAdmission(config_, request_size, active_solves_, queue_.size());
  if (admission_status != SolveAdmissionStatus::kAccepted) {
    return admission_status;
  }

  queue_.push_back(QueuedSolveRequest{
      .sequence_number = next_sequence_number_++,
      .input_payload = std::move(input_payload),
      .callback = std::move(callback),
      .deadline = std::chrono::steady_clock::now() + config_.max_queue_wait,
  });
  condition_.notify_all();
  return SolveAdmissionStatus::kAccepted;
}

void SolveCoordinator::WorkerLoop() {
  while (true) {
    std::optional<QueuedSolveRequest> queued_request;
    {
      std::unique_lock<std::mutex> lock(mutex_);
      condition_.wait(lock, [this] { return shutting_down_ || !queue_.empty(); });
      if (shutting_down_ && queue_.empty()) {
        return;
      }

      queued_request = std::move(queue_.front());
      queue_.pop_front();
      ++active_solves_;
    }
    condition_.notify_all();

    const VroomRunResult solve_result = runner_->Run(queued_request->input_payload);
    queued_request->callback(ToCoordinatedSolveResult(solve_result));

    {
      std::lock_guard<std::mutex> lock(mutex_);
      --active_solves_;
    }
    condition_.notify_all();
  }
}

void SolveCoordinator::QueueTimerLoop() {
  while (true) {
    std::optional<QueuedSolveRequest> expired_request;
    {
      std::unique_lock<std::mutex> lock(mutex_);
      condition_.wait(lock, [this] { return shutting_down_ || !queue_.empty(); });
      if (shutting_down_ && queue_.empty()) {
        return;
      }

      const std::uint64_t front_sequence_number = queue_.front().sequence_number;
      const auto front_deadline = queue_.front().deadline;
      const bool queue_changed =
          condition_.wait_until(lock, front_deadline, [this, front_sequence_number] {
            return shutting_down_ || queue_.empty() ||
                   queue_.front().sequence_number != front_sequence_number;
          });
      if (queue_changed) {
        if (shutting_down_ && queue_.empty()) {
          return;
        }
        continue;
      }

      if (queue_.empty() || std::chrono::steady_clock::now() < queue_.front().deadline) {
        continue;
      }

      expired_request = std::move(queue_.front());
      queue_.pop_front();
    }
    condition_.notify_all();

    expired_request->callback(CoordinatedSolveResult{
        .status = CoordinatedSolveStatus::kQueueWaitTimedOut,
        .output = std::nullopt,
    });
  }
}

} // namespace deliveryoptimizer::api
