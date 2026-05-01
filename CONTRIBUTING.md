# Contributing to StellarCommerce Contract

Thank you for your interest in contributing to the StellarCommerce smart contract and SDK!

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/stellar-commerce-contract.git
   cd stellar-commerce-contract
   ```
3. **Install dependencies**:
   ```bash
   # Rust toolchain
   rustup target add wasm32-unknown-unknown
   
   # Soroban CLI
   cargo install --locked soroban-cli --features opt
   
   # SDK and CLI
   cd sdk && npm install && cd ..
   cd cli && npm install && cd ..
   ```
4. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Guidelines

### Smart Contract (Rust)

#### Code Style

- Follow Rust standard formatting: `cargo fmt`
- Run Clippy for linting: `cargo clippy`
- Use descriptive variable names
- Add doc comments for public functions
- Keep functions focused and small

#### Contract Structure

```rust
// Good: Clear, documented function
/// Release escrowed funds to the merchant.
/// Can be called by the buyer or anyone after timeout.
pub fn release_payment(env: Env, caller: Address, order_id: u64) {
    // Implementation
}

// Bad: Unclear, undocumented
pub fn rel(e: Env, c: Address, o: u64) {
    // Implementation
}
```

#### Testing

Write tests for all contract functions:

```rust
#[test]
fn test_pay_escrow() {
    let env = Env::default();
    // Test setup
    // Call function
    // Assert results
}
```

Run tests:
```bash
cargo test
```

#### Security Best Practices

- **Always use `require_auth()`** for state-changing operations
- **Validate all inputs** before processing
- **Use `panic_with_error!`** for clear error messages
- **Extend storage TTL** to prevent data expiry
- **Check order status** before state transitions
- **Use `#[contracterror]`** for error enums

Example:
```rust
// Good: Proper authorization and validation
pub fn refund(env: Env, buyer: Address, order_id: u64) {
    buyer.require_auth();
    
    let order = get_order(&env, order_id)
        .unwrap_or_else(|| panic_with_error!(&env, Error::OrderNotFound));
    
    if order.buyer != buyer {
        panic_with_error!(&env, Error::Unauthorized);
    }
    
    // Process refund
}
```

### TypeScript SDK

#### Code Style

- Use TypeScript strict mode
- Avoid `any` types
- Use async/await over promises
- Export types for public APIs
- Add JSDoc comments for public methods

#### SDK Structure

```typescript
// Good: Well-typed, documented
/**
 * Build a pay_escrow transaction (unsigned XDR string).
 * @param buyerPublicKey - Buyer's Stellar address
 * @param amount - Amount in stroops (7 decimals)
 * @param orderId - Unique order identifier
 * @param timeoutSecs - Seconds until auto-release
 */
async buildPayEscrow(
  buyerPublicKey: string,
  amount: bigint,
  orderId: bigint,
  timeoutSecs: bigint,
): Promise<string> {
  // Implementation
}
```

#### Testing SDK

```bash
cd sdk
npm test
```

### CLI Tool

#### Command Structure

- Use clear, descriptive command names
- Provide helpful descriptions
- Validate required options
- Show progress and results
- Handle errors gracefully

```typescript
// Good: Clear command with validation
program
  .command("pay")
  .description("Lock funds in escrow")
  .requiredOption("--buyer <address>", "Buyer Stellar address")
  .requiredOption("--amount <stroops>", "Amount in token stroops")
  .action(async (opts: OptionValues) => {
    // Validate inputs
    // Execute command
    // Show results
  });
```

## Pull Request Process

### Before Submitting

1. **Test thoroughly**:
   ```bash
   # Test contract
   cargo test
   
   # Build contract
   cargo build --release --target wasm32-unknown-unknown
   
   # Test SDK
   cd sdk && npm test && npm run build
   
   # Test CLI
   cd cli && npm run build
   ```

2. **Run linters**:
   ```bash
   cargo fmt --check
   cargo clippy
   cd sdk && npm run lint
   cd cli && npm run lint
   ```

3. **Update documentation**:
   - Update README.md if adding features
   - Add JSDoc/doc comments to new functions
   - Update API examples if needed

4. **Write clear commit messages**:
   ```
   feat(contract): add arbitrator role for disputes
   fix(sdk): handle null return values in getOrder
   docs: update CLI usage examples
   test: add integration tests for refund flow
   ```

### PR Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Contract tests pass (`cargo test`)
- [ ] SDK builds successfully (`npm run build`)
- [ ] Tested on Stellar testnet
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated

## Related Issues
Closes #123
```

## Priority Tasks (Drips Wave)

### 🔥 High Priority

1. **Arbitrator Role**
   - Add admin address to contract storage
   - Implement dispute resolution logic
   - Allow admin to split funds or refund
   - Add tests for arbitration flow

2. **Multi-Token Support**
   - Store array of accepted tokens
   - Validate token in `pay_escrow`
   - Update SDK to handle token selection
   - Add CLI option for token choice

3. **Partial Releases**
   - Allow releasing a portion of escrowed funds
   - Track remaining balance per order
   - Update order state accordingly

4. **Contract Events Indexer**
   - Node.js service to listen to contract events
   - Parse `escrow`, `release`, `refund` events
   - Sync to PostgreSQL database
   - Provide webhook notifications

### 🚀 Medium Priority

5. **SDK Improvements**
   - Add retry logic for failed transactions
   - Implement transaction simulation
   - Add helper for batch operations
   - Support custom RPC endpoints

6. **CLI Enhancements**
   - Interactive mode for commands
   - Config file support (~/.scrc)
   - Transaction history viewer
   - Bulk operations support

7. **Contract Upgrades**
   - Implement upgradeable contract pattern
   - Add version tracking
   - Migration scripts for state

8. **Testing Suite**
   - Integration tests with testnet
   - Fuzzing tests for contract
   - E2E tests for full flow
   - Performance benchmarks

### 💡 Nice to Have

9. **Contract Analytics**
   - Track total volume
   - Count successful/failed orders
   - Calculate average order value
   - Merchant performance metrics

10. **SDK Language Bindings**
    - Python SDK
    - Go SDK
    - Rust SDK (native)

11. **Advanced Features**
    - Recurring payments
    - Subscription support
    - Multi-signature releases
    - Time-locked releases

## Code Review Guidelines

When reviewing PRs:

### Contract Reviews

- ✅ Authorization checks present (`require_auth`)
- ✅ Input validation complete
- ✅ Error handling uses `panic_with_error!`
- ✅ Storage TTL extended appropriately
- ✅ No arithmetic overflow risks
- ✅ State transitions are atomic
- ✅ Tests cover edge cases
- ✅ Gas efficiency considered

### SDK Reviews

- ✅ Types are properly defined
- ✅ Error handling is comprehensive
- ✅ No hardcoded values
- ✅ Async operations handled correctly
- ✅ Documentation is clear
- ✅ Breaking changes are noted

### CLI Reviews

- ✅ Commands are intuitive
- ✅ Help text is clear
- ✅ Errors are user-friendly
- ✅ Required options validated
- ✅ Output is formatted nicely

## Testing on Testnet

### Deploy Contract

```bash
# Generate test account
soroban keys generate test-merchant --network testnet
soroban keys fund test-merchant --network testnet

# Deploy
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/escrow.wasm \
  --source test-merchant \
  --network testnet

# Initialize
CONTRACT_ID=C...
soroban contract invoke \
  --id $CONTRACT_ID \
  --source test-merchant \
  --network testnet \
  -- initialize \
  --merchant $(soroban keys address test-merchant) \
  --token CUSDC_TOKEN_ID
```

### Test Full Flow

```bash
# Create buyer account
soroban keys generate test-buyer --network testnet
soroban keys fund test-buyer --network testnet

# Pay into escrow
soroban contract invoke \
  --id $CONTRACT_ID \
  --source test-buyer \
  --network testnet \
  -- pay_escrow \
  --buyer $(soroban keys address test-buyer) \
  --amount 10000000 \
  --order_id 1 \
  --timeout_secs 604800

# Release payment
soroban contract invoke \
  --id $CONTRACT_ID \
  --source test-buyer \
  --network testnet \
  -- release_payment \
  --caller $(soroban keys address test-buyer) \
  --order_id 1
```

## Security

### Reporting Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

Instead, email: security@stellarcommerce.example (or create a private security advisory on GitHub)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Checklist

Before mainnet deployment:

- [ ] Professional security audit completed
- [ ] All tests passing
- [ ] Fuzz testing performed
- [ ] Economic attack vectors analyzed
- [ ] Upgrade mechanism tested
- [ ] Emergency pause mechanism (if applicable)
- [ ] Rate limiting considered
- [ ] Gas optimization reviewed

## Resources

- [Stellar Docs](https://developers.stellar.org)
- [Soroban Docs](https://soroban.stellar.org/docs)
- [Rust Book](https://doc.rust-lang.org/book/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Questions?

- Open a GitHub Discussion
- Join the Stellar Discord
- Tag maintainers in issues: @Markadrian6399

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to StellarCommerce! 🚀
