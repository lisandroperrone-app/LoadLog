# LoadLog Firestore Security Specification

## 1. Data Invariants
- All collections live under `/users/{userId}/...` and are strictly private to the verified owner (`request.auth.uid == userId`, `request.auth.token.email_verified == true`, and `request.auth.token.email == 'lisandroperrone@gmail.com'`).
- Every document has an immutable `ownerId` matching `userId` and `createdAt == request.time`.
- `WeeklyEntry` cannot be created without existing `exerciseId` and `weekId` documents under the same user (`existsAfter`).
- Alternative `Exercise` records referencing `parentExerciseId` require that parent exercise to exist under the same user (`existsAfter`).
- `minWeightKg` must be `>= 0` and `<= maxWeightKg` (`<= 2000`).
- All IDs must match `^[a-zA-Z0-9_\-]+$` with length `1..128`.
- `allow list` rules explicitly enforce `resource.data.ownerId == request.auth.uid`.

## 2. Adversarial Payloads ("Dirty Dozen")
1. Unauthenticated read on `/users/{uid}/exercises/{id}` -> `PERMISSION_DENIED`.
2. Signed-in different user (`other@example.com`) read/write on `/users/{ownerUid}/entries/{id}` -> `PERMISSION_DENIED`.
3. Signed-in user with `email_verified: false` spoofing `lisandroperrone@gmail.com` -> `PERMISSION_DENIED`.
4. Blanket `list` query without `where('ownerId', '==', uid)` -> `PERMISSION_DENIED`.
5. Shadow field injection (`isAdmin: true`) on `Exercise` create -> `PERMISSION_DENIED`.
6. Shadow field injection on `WeeklyEntry` update -> `PERMISSION_DENIED`.
7. Oversized `exerciseId` (>128 chars or invalid chars) -> `PERMISSION_DENIED`.
8. `WeeklyEntry` with `minWeightKg > maxWeightKg` -> `PERMISSION_DENIED`.
9. `WeeklyEntry` referencing non-existent `exerciseId` -> `PERMISSION_DENIED`.
10. Client-forged `createdAt` or `updatedAt` timestamp not equal to `request.time` -> `PERMISSION_DENIED`.
11. Mutating immutable `ownerId` or `createdAt` on `Exercise` update -> `PERMISSION_DENIED`.
12. `Exercise` with `notes` array exceeding 30 entries or non-string first element -> `PERMISSION_DENIED`.
