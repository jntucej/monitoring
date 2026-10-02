# Auth Storage Persistence Decision

## Decision
We use `sessionStorage` instead of `localStorage` for persisting Zustand `authStore` on the client.

## Trade-offs
**Pros (sessionStorage):**
- **Security:** Automatic token clearance when the tab/window is closed prevents long-term leaked credentials on shared devices (crucial for Gate Admin terminals).
- **Hydration:** Reduces persistence conflicts across multiple active tabs and isolates SSR hydration mismatches to the active session.

**Cons (sessionStorage):**
- **Convenience:** Users must log in again if they completely close their browser, unlike `localStorage` which would persist across launches.

For a high-security internal college admin tool, the forced logout on closure is a strong security win that outweighs the minor inconvenience.
