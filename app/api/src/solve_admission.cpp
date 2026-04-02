#include "deliveryoptimizer/api/solve_admission.hpp"

namespace deliveryoptimizer::api {

SolveAdmissionStatus EvaluateSolveAdmission(const SolveAdmissionConfig& config,
                                            const SolveRequestSize& request_size,
                                            const std::size_t active_solves,
                                            const std::size_t queued_solves) {
  if (request_size.jobs > config.max_sync_jobs) {
    return SolveAdmissionStatus::kRejectedTooManyJobs;
  }
  if (request_size.vehicles > config.max_sync_vehicles) {
    return SolveAdmissionStatus::kRejectedTooManyVehicles;
  }
  if (active_solves >= config.max_concurrency && queued_solves >= config.max_queue_size) {
    return SolveAdmissionStatus::kRejectedQueueFull;
  }
  return SolveAdmissionStatus::kAccepted;
}

} // namespace deliveryoptimizer::api
