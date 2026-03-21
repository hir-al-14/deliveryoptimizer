{
  description = "Delivery Optimizer backend development shell with a consistent Nix LLVM toolchain";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/f8573b9c935cfaa162dd62cc9e75ae2db86f85df";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [
        "aarch64-darwin"
        "x86_64-linux"
      ];
      forAllSystems = f:
        nixpkgs.lib.genAttrs systems (system:
          f (import nixpkgs {
            inherit system;
            config.allowUnfree = true;
          }));
    in
    {
      devShells = forAllSystems (pkgs:
        let
          llvm = pkgs.llvmPackages;
          clang = llvm.clang;
        in
        {
          default = pkgs.mkShell {
            packages = [
              clang
              llvm.clang-tools
              llvm.lld
              pkgs.ccache
              pkgs.cmake
              pkgs.conan
              pkgs.curl
              pkgs.docker
              pkgs.docker-compose
              pkgs.git
              pkgs.jq
              pkgs.ninja
              pkgs.pkg-config
              pkgs.postgresql
              pkgs.python3
            ];

            env = {
              CC = "${clang}/bin/clang";
              CXX = "${clang}/bin/clang++";
              CMAKE_C_COMPILER = "${clang}/bin/clang";
              CMAKE_CXX_COMPILER = "${clang}/bin/clang++";
              CMAKE_GENERATOR = "Ninja";
            };

            shellHook = ''
              export DELIVERYOPTIMIZER_NIX_LLVM=1
              echo "Entered deliveryoptimizer backend dev shell."
              echo "Compiler: $(command -v clang++)"
              echo "Next step: conan profile detect --force && cmake --preset conan-release"
            '';
          };
        });

      formatter = forAllSystems (pkgs: pkgs.nixfmt-rfc-style);
    };
}
