# StellarCommerce - Planned Issues for Drips Wave

This document outlines scoped issues for contributors during Drips Wave sprint cycles. Issues are categorized by difficulty, type, and repository.

---

## 🔥 High Priority Issues

### Smart Contract (stellar-commerce-contract)

#### Issue #1: Implement Arbitrator Role for Dispute Resolution
**Type:** New Feature  
**Difficulty:** Medium  
**Estimated Time:** 3-5 days  
**Skills:** Rust, Soroban, Smart Contracts

**Description:**
Add an admin/arbitrator role to the escrow contract that can resolve disputes between buyers and merchants.

**Acceptance Criteria:**
- [ ] Add `arbitrator` field to contract storage
- [ ] Implement `set_arbitrator()` function (merchant-only)
- [ ] Implement `resolve_dispute()` function (arbitrator-only)
- [ ] Support three resolution types: refund buyer, release to merchant, split funds
- [ ] Add `Disputed` status handling
- [ ] Write comprehensive tests
- [ ] Update SDK with new functions
- [ ] Update CLI with dispute commands

**Resources:**
- Contract: `contracts/escrow/src/lib.rs`
- Tests: Add to contract tests
- Docs: Update README.md

---

#### Issue #2: Add Multi-Token Support
**Type:** New Feature  
**Difficulty:** Medium  
**Estimated Time:** 2-4 days  
**Skills:** Rust, Soroban

**Description:**
Extend the contract to accept multiple tokens (USDC, EURC, XLM) instead of a single hardcoded token.

**Acceptance Criteria:**
- [ ] Replace single `Token` storage with `Vec<Address>` of accepted tokens
- [ ] Add `add_token()` function (merchant-only)
- [ ] Add `remove_token()` function (merchant-only)
- [ ] Validate token in `pay_escrow()` against whitelist
- [ ] Update `OrderState` to store which token was used
- [ ] Write tests for multi-token scenarios
- [ ] Update SDK to handle token selection
- [ ] Update CLI with `--token` flag

**Resources:**
- Contract: `contracts/escrow/src/lib.rs`
- SDK: `sdk/src/index.ts`
- CLI: `cli/src/index.ts`

---

#### Issue #3: Implement Partial Payment Releases
**Type:** New Feature  
**Difficulty:** Hard  
**Estimated Time:** 4-6 days  
**Skills:** Rust, Soroban, Math

**Description:**
Allow releasing a portion of escrowed funds instead of all-or-nothing releases.

**Acceptance Criteria:**
- [ ] Add `remaining_amount` field to `OrderState`
- [ ] Modify `release_payment()` to accept an amount parameter
- [ ] Validate amount doesn't exceed remaining balance
- [ ] Update order status only when fully released
- [ ] Handle edge cases (rounding, minimum amounts)
- [ ] Write comprehensive tests
- [ ] Update SDK and CLI

**Resources:**
- Contract: `contracts/escrow/src/lib.rs`
- Consider overflow/underflow scenarios

---

### Frontend (stellar-commerce-frontend)

#### Issue #4: Implement Complete Checkout Flow
**Type:** New Feature  
**Difficulty:** Medium  
**Estimated Time:** 3-5 days  
**Skills:** React, TypeScript, Stellar SDK

**Description:**
Complete the buyer checkout flow from cart to escrow payment.

**Acceptance Criteria:**
- [ ] Create checkout page with order summary
- [ ] Integrate Freighter wallet signing
- [ ] Call SDK `buildPayEscrow()` with cart data
- [ ] Sign transaction with Freighter
- [ ] Submit to Stellar network
- [ ] Show loading states and confirmations
- [ ] Handle errors gracefully
- [ ] Store order in backend API
- [ ] Redirect to order confirmation page

**Resources:**
- Components: `app/checkout/page.tsx` (create)
- Hooks: `hooks/useWallet.ts`
- SDK: `lib/stellar.ts`

---

#### Issue #5: Build Order History Page
**Type:** New Feature  
**Difficulty:** Easy  
**Estimated Time:** 2-3 days  
**Skills:** React, TypeScript, REST API

**Description:**
Create a page where buyers can view their order history and current status.

**Acceptance Criteria:**
- [ ] Create `/orders` page
- [ ] Fetch orders from backend API
- [ ] Display order list with status badges
- [ ] Show order details (products, amount, date)
- [ ] Add "Release Payment" button for pending orders
- [ ] Add "Request Refund" button for pending orders
- [ ] Implement real-time status updates (polling or WebSocket)
- [ ] Add filtering by status

**Resources:**
- Page: `app/orders/page.tsx` (create)
- Components: Reuse `OrderList.tsx`
- API: Backend `/api/orders/buyer/:address`

---

#### Issue #6: Add Real-Time Order Status Updates
**Type:** New Feature  
**Difficulty:** Medium  
**Estimated Time:** 3-4 days  
**Skills:** React, TypeScript, WebSocket/Polling

**Description:**
Implement real-time updates for order status changes.

**Acceptance Criteria:**
- [ ] Poll contract for order status every 10 seconds
- [ ] Update UI when status changes
- [ ] Show toast notifications for status changes
- [ ] Implement WebSocket connection (optional)
- [ ] Handle connection errors gracefully
- [ ] Add loading indicators
- [ ] Optimize to avoid excessive RPC calls

**Resources:**
- Hook: `hooks/useOrderStatus.ts` (create)
- Service: `lib/orderSync.ts` (create)

---

### Backend (stellar-commerce-backend)

#### Issue #7: Build Stellar Event Listener Service
**Type:** New Feature  
**Difficulty:** Hard  
**Estimated Time:** 5-7 days  
**Skills:** Node.js, Stellar SDK, PostgreSQL

**Description:**
Create a service that monitors Stellar contract events and syncs order status to the database.

**Acceptance Criteria:**
- [ ] Listen to contract events (`escrow`, `release`, `refund`)
- [ ] Parse event data and extract order information
- [ ] Update database when events are detected
- [ ] Handle missed events (catch-up mechanism)
- [ ] Implement retry logic for failed syncs
- [ ] Add logging for all events
- [ ] Create webhook system to notify frontend
- [ ] Write tests for event parsing

**Resources:**
- Service: `src/services/eventListener.ts` (create)
- Stellar SDK: Event streaming API
- Database: Update `orders` table

---

#### Issue #8: Implement Product Management API
**Type:** New Feature  
**Difficulty:** Easy  
**Estimated Time:** 2-3 days  
**Skills:** Node.js, Express, PostgreSQL

**Description:**
Create CRUD endpoints for product management.

**Acceptance Criteria:**
- [ ] Create `products` table schema
- [ ] Implement `POST /api/products` (create product)
- [ ] Implement `GET /api/products` (list products)
- [ ] Implement `GET /api/products/:id` (get product)
- [ ] Implement `PATCH /api/products/:id` (update product)
- [ ] Implement `DELETE /api/products/:id` (delete product)
- [ ] Add input validation
- [ ] Add merchant authorization
- [ ] Write API tests

**Resources:**
- Model: `src/models/Product.ts` (create)
- Controller: `src/controllers/productController.ts` (create)
- Routes: `src/routes/products.ts` (create)

---

#### Issue #9: Add JWT Authentication for Merchants
**Type:** New Feature  
**Difficulty:** Medium  
**Estimated Time:** 3-4 days  
**Skills:** Node.js, JWT, Security

**Description:**
Implement JWT-based authentication for merchant endpoints.

**Acceptance Criteria:**
- [ ] Create `POST /api/auth/login` endpoint
- [ ] Verify Stellar signature for authentication
- [ ] Generate JWT tokens
- [ ] Create authentication middleware
- [ ] Protect merchant-only endpoints
- [ ] Implement token refresh mechanism
- [ ] Add rate limiting
- [ ] Write security tests

**Resources:**
- Middleware: `src/middleware/auth.ts` (create)
- Controller: `src/controllers/authController.ts` (create)
- Library: `jsonwebtoken`

---

## 🚀 Medium Priority Issues

### Documentation

#### Issue #10: Create Video Tutorial Series
**Type:** Documentation  
**Difficulty:** Easy  
**Estimated Time:** 3-5 days  
**Skills:** Video editing, Technical writing

**Description:**
Create video tutorials showing how to use StellarCommerce.

**Deliverables:**
- [ ] "Getting Started" video (5 min)
- [ ] "Deploying Your First Contract" video (10 min)
- [ ] "Building a Merchant Dashboard" video (15 min)
- [ ] "Integrating with Your E-commerce Site" video (20 min)
- [ ] Upload to YouTube
- [ ] Add links to README

---

#### Issue #11: Write Integration Guide for Popular E-commerce Platforms
**Type:** Documentation  
**Difficulty:** Medium  
**Estimated Time:** 4-6 days  
**Skills:** Technical writing, E-commerce platforms

**Description:**
Create integration guides for Shopify, WooCommerce, and Magento.

**Deliverables:**
- [ ] Shopify integration guide
- [ ] WooCommerce plugin guide
- [ ] Magento extension guide
- [ ] Code examples for each platform
- [ ] Troubleshooting section
- [ ] Add to `docs/` folder

---

### Testing

#### Issue #12: Add Integration Tests for Full Payment Flow
**Type:** Testing  
**Difficulty:** Medium  
**Estimated Time:** 3-4 days  
**Skills:** Testing, Stellar SDK, Rust

**Description:**
Write end-to-end integration tests covering the complete payment flow.

**Acceptance Criteria:**
- [ ] Test: Deploy contract → Initialize → Pay → Release
- [ ] Test: Deploy contract → Initialize → Pay → Refund
- [ ] Test: Deploy contract → Initialize → Pay → Timeout → Auto-release
- [ ] Test: Multiple orders in parallel
- [ ] Test: Error scenarios (insufficient funds, invalid addresses)
- [ ] Run tests on Stellar testnet
- [ ] Add to CI/CD pipeline

**Resources:**
- Tests: `contracts/escrow/tests/integration_test.rs` (create)
- Use Soroban test utilities

---

#### Issue #13: Implement Fuzz Testing for Contract
**Type:** Testing  
**Difficulty:** Hard  
**Estimated Time:** 4-6 days  
**Skills:** Rust, Fuzzing, Security

**Description:**
Add fuzz testing to discover edge cases and vulnerabilities.

**Acceptance Criteria:**
- [ ] Set up cargo-fuzz
- [ ] Create fuzz targets for all public functions
- [ ] Run fuzzing for 24+ hours
- [ ] Document any issues found
- [ ] Fix discovered bugs
- [ ] Add regression tests

**Resources:**
- Tool: `cargo-fuzz`
- Targets: `fuzz/fuzz_targets/` (create)

---

### Performance & Optimization

#### Issue #14: Optimize Contract Gas Usage
**Type:** Optimization  
**Difficulty:** Medium  
**Estimated Time:** 2-3 days  
**Skills:** Rust, Soroban, Performance

**Description:**
Analyze and optimize contract gas consumption.

**Acceptance Criteria:**
- [ ] Benchmark current gas usage for all functions
- [ ] Identify optimization opportunities
- [ ] Reduce storage reads/writes
- [ ] Optimize data structures
- [ ] Re-benchmark and document improvements
- [ ] Ensure no functionality is broken

**Resources:**
- Tool: Soroban gas profiler
- Contract: `contracts/escrow/src/lib.rs`

---

#### Issue #15: Add Redis Caching to Backend API
**Type:** Optimization  
**Difficulty:** Easy  
**Estimated Time:** 2-3 days  
**Skills:** Node.js, Redis, Caching

**Description:**
Implement Redis caching for frequently accessed data.

**Acceptance Criteria:**
- [ ] Set up Redis connection
- [ ] Cache merchant data (1 hour TTL)
- [ ] Cache product listings (5 min TTL)
- [ ] Cache order status (30 sec TTL)
- [ ] Implement cache invalidation
- [ ] Add cache hit/miss metrics
- [ ] Update documentation

**Resources:**
- Library: `ioredis`
- Service: `src/services/cache.ts` (create)

---

## 💡 Nice to Have Issues

#### Issue #16: Build Mobile App with React Native
**Type:** New Feature  
**Difficulty:** Hard  
**Estimated Time:** 2-3 weeks  
**Skills:** React Native, Mobile development

**Description:**
Create a mobile app for buyers and merchants.

**Deliverables:**
- [ ] React Native project setup
- [ ] Mobile wallet integration
- [ ] Product browsing UI
- [ ] Checkout flow
- [ ] Order tracking
- [ ] Push notifications
- [ ] iOS and Android builds

---

#### Issue #17: Implement Subscription Payments
**Type:** New Feature  
**Difficulty:** Hard  
**Estimated Time:** 1-2 weeks  
**Skills:** Rust, Soroban, Complex logic

**Description:**
Add support for recurring subscription payments.

**Deliverables:**
- [ ] Subscription contract logic
- [ ] Automatic payment scheduling
- [ ] Cancellation mechanism
- [ ] Grace period handling
- [ ] SDK and CLI updates

---

#### Issue #18: Create Admin Dashboard
**Type:** New Feature  
**Difficulty:** Medium  
**Estimated Time:** 1 week  
**Skills:** React, TypeScript, Charts

**Description:**
Build an admin dashboard for platform analytics.

**Deliverables:**
- [ ] Revenue charts
- [ ] Order statistics
- [ ] Merchant performance metrics
- [ ] User analytics
- [ ] Export functionality

---

## Bug Fixes

#### Issue #19: Fix Wallet Connection on Page Reload
**Type:** Bug Fix  
**Difficulty:** Easy  
**Estimated Time:** 1-2 days  
**Skills:** React, TypeScript

**Description:**
Wallet disconnects when user refreshes the page.

**Steps to Reproduce:**
1. Connect Freighter wallet
2. Refresh page
3. Wallet shows as disconnected

**Expected:** Wallet should remain connected after refresh

---

#### Issue #20: Handle Transaction Timeout Errors
**Type:** Bug Fix  
**Difficulty:** Easy  
**Estimated Time:** 1 day  
**Skills:** TypeScript, Error handling

**Description:**
Improve error handling when transactions timeout.

**Acceptance Criteria:**
- [ ] Catch timeout errors
- [ ] Show user-friendly message
- [ ] Provide retry option
- [ ] Log error details

---

## Issue Labels

Use these labels to categorize issues:

- `good-first-issue` - Easy issues for newcomers
- `help-wanted` - Issues needing contributors
- `high-priority` - Critical for Wave success
- `bug` - Bug fixes
- `feature` - New features
- `documentation` - Docs improvements
- `testing` - Test coverage
- `performance` - Optimization work
- `security` - Security-related
- `frontend` - Frontend work
- `backend` - Backend work
- `contract` - Smart contract work

---

## Sprint Cycle Structure

**Week 1-2:** High priority issues (#1-#9)  
**Week 3-4:** Medium priority issues (#10-#15)  
**Week 5-6:** Nice to have issues (#16-#18) + Bug fixes

---

## Contributor Rewards

Issues will be tagged with reward amounts based on difficulty:
- **Easy:** 50-100 XLM
- **Medium:** 100-200 XLM
- **Hard:** 200-500 XLM

Rewards distributed via Drips Wave program.

---

## How to Claim an Issue

1. Comment on the issue: "I'd like to work on this"
2. Wait for maintainer assignment
3. Fork the repository
4. Create a branch: `feature/issue-number-description`
5. Submit PR when complete
6. Reference issue in PR: "Closes #X"

---

**Last Updated:** May 2, 2026  
**Maintainer:** @Markadrian6399
