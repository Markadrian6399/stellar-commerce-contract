/**
 * StellarCommerce SDK
 * Thin wrapper around the Soroban escrow contract for merchant integrations.
 */

import {
  Account,
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  Address,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

export type Network = "mainnet" | "testnet" | "futurenet";

const RPC_URLS: Record<Network, string> = {
  mainnet:   "https://mainnet.sorobanrpc.com",
  testnet:   "https://soroban-testnet.stellar.org",
  futurenet: "https://rpc-futurenet.stellar.org",
};

const NETWORK_PASSPHRASES: Record<Network, string> = {
  mainnet:   Networks.PUBLIC,
  testnet:   Networks.TESTNET,
  futurenet: Networks.FUTURENET,
};

// Placeholder account used for read-only simulations (no auth needed).
// Sequence number 0 is fine for simulation — it is never submitted.
const SIMULATION_SOURCE = new Account(
  "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
  "0",
);

export interface EscrowClientOptions {
  contractId: string;
  network:    Network;
  /** Soroban RPC URL override */
  rpcUrl?:    string;
}

export interface OrderState {
  buyer:      string;
  amount:     bigint;
  status:     "Pending" | "Released" | "Refunded" | "Disputed";
  createdAt:  bigint;
  timeout:    bigint;
}

export class EscrowClient {
  private contract:   Contract;
  private server:     SorobanRpc.Server;
  readonly passphrase: string;

  constructor(opts: EscrowClientOptions) {
    this.contract   = new Contract(opts.contractId);
    this.server     = new SorobanRpc.Server(opts.rpcUrl ?? RPC_URLS[opts.network]);
    this.passphrase = NETWORK_PASSPHRASES[opts.network];
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Fetch the on-chain account and return a ready-to-use TransactionBuilder.
   * The caller must call `.build()` on the result.
   */
  async buildTx(
    sourcePublicKey: string,
    operation: xdr.Operation,
  ): Promise<TransactionBuilder> {
    const account = await this.server.getAccount(sourcePublicKey);
    return new TransactionBuilder(account, {
      fee:               BASE_FEE,
      networkPassphrase: this.passphrase,
    })
      .addOperation(operation)
      .setTimeout(30);
  }

  // ── Contract calls ───────────────────────────────────────────────────────

  /**
   * Build an `initialize` transaction (unsigned XDR string).
   * Sign and submit with your preferred wallet/keypair.
   */
  async buildInitialize(
    merchantPublicKey: string,
    tokenAddress:      string,
  ): Promise<string> {
    const op = this.contract.call(
      "initialize",
      new Address(merchantPublicKey).toScVal(),
      new Address(tokenAddress).toScVal(),
    );
    const builder = await this.buildTx(merchantPublicKey, op);
    return builder.build().toXDR();
  }

  /**
   * Build a `pay_escrow` transaction (unsigned XDR string).
   * @param timeoutSecs seconds until auto-release is allowed (e.g. 7 * 24 * 3600 for 7 days)
   */
  async buildPayEscrow(
    buyerPublicKey: string,
    amount:         bigint,
    orderId:        bigint,
    timeoutSecs:    bigint,
  ): Promise<string> {
    const op = this.contract.call(
      "pay_escrow",
      new Address(buyerPublicKey).toScVal(),
      nativeToScVal(amount,      { type: "i128" }),
      nativeToScVal(orderId,     { type: "u64"  }),
      nativeToScVal(timeoutSecs, { type: "u64"  }),
    );
    const builder = await this.buildTx(buyerPublicKey, op);
    return builder.build().toXDR();
  }

  /** Build a `release_payment` transaction (unsigned XDR string). */
  async buildReleasePayment(
    callerPublicKey: string,
    orderId:         bigint,
  ): Promise<string> {
    const op = this.contract.call(
      "release_payment",
      new Address(callerPublicKey).toScVal(),
      nativeToScVal(orderId, { type: "u64" }),
    );
    const builder = await this.buildTx(callerPublicKey, op);
    return builder.build().toXDR();
  }

  /** Build a `refund` transaction (unsigned XDR string). */
  async buildRefund(
    buyerPublicKey: string,
    orderId:        bigint,
  ): Promise<string> {
    const op = this.contract.call(
      "refund",
      new Address(buyerPublicKey).toScVal(),
      nativeToScVal(orderId, { type: "u64" }),
    );
    const builder = await this.buildTx(buyerPublicKey, op);
    return builder.build().toXDR();
  }

  /**
   * Fetch order state via simulation (read-only, no signing needed).
   * Uses a local Account object — no network call to fetch account state.
   */
  async getOrder(orderId: bigint): Promise<OrderState> {
    const op = this.contract.call(
      "get_order",
      nativeToScVal(orderId, { type: "u64" }),
    );

    // Build with a local Account — avoids getAccount() network call for read-only ops
    const tx = new TransactionBuilder(SIMULATION_SOURCE, {
      fee:               BASE_FEE,
      networkPassphrase: this.passphrase,
    })
      .addOperation(op)
      .setTimeout(30)
      .build();

    const result = await this.server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(result)) {
      throw new Error(`Simulation failed: ${result.error}`);
    }

    const successResult = result as SorobanRpc.Api.SimulateTransactionSuccessResponse;
    const retval = successResult.result?.retval;
    if (!retval) throw new Error("Contract returned no value for get_order");

    const native = scValToNative(retval) as Record<string, unknown>;
    return {
      buyer:     native["buyer"]      as string,
      amount:    native["amount"]     as bigint,
      status:    native["status"]     as OrderState["status"],
      createdAt: native["created_at"] as bigint,
      timeout:   native["timeout"]    as bigint,
    };
  }
}
