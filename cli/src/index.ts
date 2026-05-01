#!/usr/bin/env node
/**
 * sc — StellarCommerce CLI
 * Manage escrow contracts from the terminal.
 *
 * Usage examples:
 *   sc init    --merchant G... --token C... --secret S...
 *   sc pay     --buyer G... --amount 10000000 --order 1 --timeout 604800 --secret S...
 *   sc release --caller G... --order 1 --secret S...
 *   sc refund  --buyer G... --order 1 --secret S...
 *   sc status  --order 1
 */

import "dotenv/config";
import { Command, OptionValues } from "commander";
import {
  Keypair,
  SorobanRpc,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { EscrowClient, Network } from "@stellar-commerce/sdk";

const CONTRACT_ID = process.env["CONTRACT_ID"] ?? "";
const NETWORK     = (process.env["NETWORK"] ?? "testnet") as Network;
const RPC_URL     = process.env["RPC_URL"];

function getClient(): EscrowClient {
  return new EscrowClient({ contractId: CONTRACT_ID, network: NETWORK, rpcUrl: RPC_URL });
}

/**
 * Sign a prepared Soroban transaction and submit it.
 * prepareTransaction() must be called BEFORE signing — it injects the
 * simulation footprint. Signing the raw tx first and then preparing it
 * would invalidate the signature.
 */
async function signAndSubmit(xdrTx: string, secretKey: string): Promise<void> {
  const client  = getClient();
  const keypair = Keypair.fromSecret(secretKey);
  const server  = new SorobanRpc.Server(RPC_URL ?? "https://soroban-testnet.stellar.org");

  // Reconstruct the transaction using the correct network passphrase
  const tx = TransactionBuilder.fromXDR(xdrTx, client.passphrase);

  // prepareTransaction fetches the simulation footprint and returns a new tx
  const prepared = await server.prepareTransaction(tx);

  // Sign AFTER preparation — the footprint is now baked in
  prepared.sign(keypair);

  const result = await server.sendTransaction(prepared);
  console.log(`Submitted: ${result.hash} — status: ${result.status}`);
}

const program = new Command()
  .name("sc")
  .description("StellarCommerce escrow CLI")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize the escrow contract")
  .requiredOption("--merchant <address>", "Merchant Stellar address")
  .requiredOption("--token <address>",    "Token contract address (e.g. USDC)")
  .requiredOption("--secret <key>",       "Merchant secret key")
  .action(async (opts: OptionValues) => {
    const xdr = await getClient().buildInitialize(
      opts["merchant"] as string,
      opts["token"]    as string,
    );
    await signAndSubmit(xdr, opts["secret"] as string);
  });

program
  .command("pay")
  .description("Lock funds in escrow")
  .requiredOption("--buyer <address>",  "Buyer Stellar address")
  .requiredOption("--amount <stroops>", "Amount in token stroops (7 decimals)")
  .requiredOption("--order <id>",       "Unique order ID")
  .requiredOption("--timeout <secs>",   "Seconds until auto-release (e.g. 604800 = 7 days)")
  .requiredOption("--secret <key>",     "Buyer secret key")
  .action(async (opts: OptionValues) => {
    const xdr = await getClient().buildPayEscrow(
      opts["buyer"]   as string,
      BigInt(opts["amount"]  as string),
      BigInt(opts["order"]   as string),
      BigInt(opts["timeout"] as string),
    );
    await signAndSubmit(xdr, opts["secret"] as string);
  });

program
  .command("release")
  .description("Release payment to merchant")
  .requiredOption("--caller <address>", "Caller address (buyer or anyone after timeout)")
  .requiredOption("--order <id>",       "Order ID")
  .requiredOption("--secret <key>",     "Caller secret key")
  .action(async (opts: OptionValues) => {
    const xdr = await getClient().buildReleasePayment(
      opts["caller"] as string,
      BigInt(opts["order"] as string),
    );
    await signAndSubmit(xdr, opts["secret"] as string);
  });

program
  .command("refund")
  .description("Refund buyer (dispute)")
  .requiredOption("--buyer <address>", "Buyer address")
  .requiredOption("--order <id>",      "Order ID")
  .requiredOption("--secret <key>",    "Buyer secret key")
  .action(async (opts: OptionValues) => {
    const xdr = await getClient().buildRefund(
      opts["buyer"] as string,
      BigInt(opts["order"] as string),
    );
    await signAndSubmit(xdr, opts["secret"] as string);
  });

program
  .command("status")
  .description("Check order status (read-only)")
  .requiredOption("--order <id>", "Order ID")
  .action(async (opts: OptionValues) => {
    const order = await getClient().getOrder(BigInt(opts["order"] as string));
    console.table(order);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
