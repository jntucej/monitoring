#!/usr/bin/env bash
# scripts/verify-image-signature.sh
# L4 gate: refuse to run an image that is not signed by the supply-chain
# workflow (keyless Cosign / Sigstore OIDC) and does not carry the SBOM
# attestation. Call before `docker compose up` in the deploy script.
set -euo pipefail

IMAGE="${1:?usage: verify-image-signature.sh <image>}"
IDENTITY_REGEX="${COSIGN_IDENTITY_REGEX:-https://github.com/.*/.github/workflows/supply-chain.yml@refs/heads/main}"
OIDC_ISSUER="https://token.actions.githubusercontent.com"

echo "Verifying signature on $IMAGE ..."
cosign verify "$IMAGE" \
  --certificate-identity-regexp "$IDENTITY_REGEX" \
  --certificate-oidc-issuer "$OIDC_ISSUER"

echo "Verifying SBOM attestation on $IMAGE ..."
cosign verify-attestation "$IMAGE" \
  --type cyclonedx \
  --certificate-identity-regexp "$IDENTITY_REGEX" \
  --certificate-oidc-issuer "$OIDC_ISSUER" > /dev/null

echo "✓ Image $IMAGE is signed by the supply-chain workflow and carries the SBOM."
