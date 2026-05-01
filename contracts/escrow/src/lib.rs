//! StellarCommerce Escrow Contract
//!
//! A non-custodial escrow for merchant payments using USDC (or any SEP-41 token).
//! Flow: buyer calls pay_escrow → funds held in contract → buyer (or timeout) releases → merchant paid.
//! Disputes: buyer calls refund before release, or admin arbitrates.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, token, Address, Env,
    symbol_short, panic_with_error,
};

// ── Storage Keys ────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Merchant,
    Token,
    Order(u64),   // order_id → OrderState
}

// ── Data Types ───────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum OrderStatus {
    Pending,
    Released,
    Refunded,
    Disputed,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct OrderState {
    pub buyer:      Address,
    pub amount:     i128,
    pub status:     OrderStatus,
    pub created_at: u64,   // ledger timestamp
    pub timeout:    u64,   // auto-release after this timestamp
}

// ── Errors ───────────────────────────────────────────────────────────────────

/// Contract errors. `#[contracterror]` maps each variant to a u32 code and
/// implements `From<Error> for soroban_sdk::Error` automatically.
#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized  = 1,
    NotInitialized      = 2,
    OrderNotFound       = 3,
    InvalidAmount       = 4,
    Unauthorized        = 5,
    OrderNotPending     = 6,
    TimeoutNotReached   = 7,
}

// ── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {

    /// One-time setup: register the merchant address and accepted token.
    /// Must be called by the deployer before any payments.
    pub fn initialize(env: Env, merchant: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Merchant) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }

        merchant.require_auth();

        env.storage().instance().set(&DataKey::Merchant, &merchant);
        env.storage().instance().set(&DataKey::Token, &token);

        // Keep instance storage alive for ~1 year of ledgers
        env.storage().instance().extend_ttl(2_000_000, 2_000_000);

        env.events().publish(
            (symbol_short!("init"),),
            (merchant, token),
        );
    }

    /// Buyer locks funds into escrow for a specific order.
    /// `timeout_secs`: seconds from now before auto-release is allowed.
    pub fn pay_escrow(
        env:          Env,
        buyer:        Address,
        amount:       i128,
        order_id:     u64,
        timeout_secs: u64,
    ) -> u64 {
        buyer.require_auth();

        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let token: Address = env.storage().instance()
            .get(&DataKey::Token)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));

        // Ensure order_id is unique
        if env.storage().persistent().has(&DataKey::Order(order_id)) {
            panic_with_error!(&env, Error::OrderNotPending);
        }

        // Pull funds from buyer into this contract
        token::Client::new(&env, &token).transfer(
            &buyer,
            &env.current_contract_address(),
            &amount,
        );

        let now = env.ledger().timestamp();
        let order = OrderState {
            buyer:      buyer.clone(),
            amount,
            status:     OrderStatus::Pending,
            created_at: now,
            timeout:    now + timeout_secs,
        };

        env.storage().persistent().set(&DataKey::Order(order_id), &order);
        env.storage().persistent().extend_ttl(
            &DataKey::Order(order_id),
            500_000,
            500_000,
        );

        env.events().publish(
            (symbol_short!("escrow"),),
            (buyer, order_id, amount),
        );

        order_id
    }

    /// Release escrowed funds to the merchant.
    /// Can be called by:
    ///   - the buyer (confirms delivery), OR
    ///   - anyone once the timeout has passed (auto-release).
    pub fn release_payment(env: Env, caller: Address, order_id: u64) {
        let mut order: OrderState = env.storage().persistent()
            .get(&DataKey::Order(order_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::OrderNotFound));

        if order.status != OrderStatus::Pending {
            panic_with_error!(&env, Error::OrderNotPending);
        }

        let now = env.ledger().timestamp();
        let is_buyer   = caller == order.buyer;
        let timed_out  = now >= order.timeout;

        if !is_buyer && !timed_out {
            panic_with_error!(&env, Error::TimeoutNotReached);
        }

        // Only require auth when the caller is the buyer (not a permissionless timeout)
        if is_buyer {
            caller.require_auth();
        }

        let merchant: Address = env.storage().instance()
            .get(&DataKey::Merchant)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));

        let token: Address = env.storage().instance()
            .get(&DataKey::Token)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));

        token::Client::new(&env, &token).transfer(
            &env.current_contract_address(),
            &merchant,
            &order.amount,
        );

        order.status = OrderStatus::Released;
        env.storage().persistent().set(&DataKey::Order(order_id), &order);

        env.events().publish(
            (symbol_short!("release"),),
            (order_id, merchant, order.amount),
        );
    }

    /// Refund the buyer. Can only be called by the buyer while order is Pending.
    /// In a real deployment you'd add an admin/arbitrator role for disputes.
    pub fn refund(env: Env, buyer: Address, order_id: u64) {
        buyer.require_auth();

        let mut order: OrderState = env.storage().persistent()
            .get(&DataKey::Order(order_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::OrderNotFound));

        if order.status != OrderStatus::Pending {
            panic_with_error!(&env, Error::OrderNotPending);
        }

        if order.buyer != buyer {
            panic_with_error!(&env, Error::Unauthorized);
        }

        let token: Address = env.storage().instance()
            .get(&DataKey::Token)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized));

        token::Client::new(&env, &token).transfer(
            &env.current_contract_address(),
            &buyer,
            &order.amount,
        );

        order.status = OrderStatus::Refunded;
        env.storage().persistent().set(&DataKey::Order(order_id), &order);

        env.events().publish(
            (symbol_short!("refund"),),
            (order_id, buyer, order.amount),
        );
    }

    /// Read-only: fetch order state.
    pub fn get_order(env: Env, order_id: u64) -> OrderState {
        env.storage().persistent()
            .get(&DataKey::Order(order_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::OrderNotFound))
    }

    /// Read-only: fetch merchant address.
    pub fn get_merchant(env: Env) -> Address {
        env.storage().instance()
            .get(&DataKey::Merchant)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotInitialized))
    }
}
