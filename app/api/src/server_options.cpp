#include "deliveryoptimizer/api/server_options.hpp"

#include <algorithm>
#include <charconv>
#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <optional>
#include <string_view>
#include <system_error>
#include <thread>

namespace {

constexpr std::uint16_t kDefaultListenPort = 8080U;
constexpr std::size_t kMaxWorkerThreads = 64U;

[[nodiscard]] std::optional<std::uint16_t> ResolveListenPort() {
  const char* raw_port = std::getenv("DELIVERYOPTIMIZER_PORT");
  if (raw_port == nullptr || *raw_port == '\0') {
    return kDefaultListenPort;
  }

  const std::string_view port_text{raw_port};
  int parsed_port = 0;
  const auto [end_ptr, error] =
      std::from_chars(port_text.data(), port_text.data() + port_text.size(), parsed_port);

  if (error != std::errc{} || end_ptr != port_text.data() + port_text.size() || parsed_port < 1 ||
      parsed_port > static_cast<int>(std::numeric_limits<std::uint16_t>::max())) {
    std::cerr << "Invalid DELIVERYOPTIMIZER_PORT='" << raw_port
              << "'. Expected an integer in the range 1..65535.\n";
    return std::nullopt;
  }

  return static_cast<std::uint16_t>(parsed_port);
}

[[nodiscard]] std::size_t ResolveThreadCount() {
  const auto detected = std::thread::hardware_concurrency();
  const std::size_t default_threads = detected == 0U ? 1U : static_cast<std::size_t>(detected);
  const std::size_t bounded_default_threads = std::min(default_threads, kMaxWorkerThreads);

  const char* raw_threads = std::getenv("DELIVERYOPTIMIZER_THREADS");
  if (raw_threads == nullptr || *raw_threads == '\0') {
    return bounded_default_threads;
  }

  errno = 0;
  char* end = nullptr;
  const long parsed = std::strtol(raw_threads, &end, 10);
  const bool invalid = errno != 0 || end == raw_threads || *end != '\0' || parsed <= 0L;
  if (invalid) {
    return bounded_default_threads;
  }

  const auto requested_threads = static_cast<std::size_t>(parsed);
  return std::min(requested_threads, kMaxWorkerThreads);
}

} // namespace

namespace deliveryoptimizer::api {

std::optional<ServerOptions> LoadServerOptionsFromEnv() {
  const auto listen_port = ResolveListenPort();
  if (!listen_port.has_value()) {
    return std::nullopt;
  }

  return ServerOptions{.listen_port = *listen_port, .worker_threads = ResolveThreadCount()};
}

} // namespace deliveryoptimizer::api
