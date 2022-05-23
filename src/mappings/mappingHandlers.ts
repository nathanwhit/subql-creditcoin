import {
  SubstrateExtrinsic,
  SubstrateEvent,
  SubstrateBlock,
} from "@subql/types";
import { Block, Extrinsic, ExtrinsicV4, Account, Event } from "../types";
import { Balance } from "@polkadot/types/interfaces";
import { GenericAccountId } from "@polkadot/types/generic";
import { U256 } from "@polkadot/types-codec";
import { decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";
import { uniq } from "lodash";

const ACCOUNT_TYPES = ["Address", "LookupSource", "AccountId", "AccountId32"];
const eventsMapping = {
  
};

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  let record = new Block(block.block.header.number.toString());

  record.hash = block.block.hash.toHex();
  record.number = block.block.header.number.toNumber();
  record.parentHash = block.block.header.parentHash.toHex();
  record.timestamp = block.timestamp;
  const preRuntime = block.block.header.digest.logs.find(
    (log) => log.isPreRuntime
  ).asPreRuntime;
  const author = GenericAccountId.from(preRuntime[1]).toString();
  record.author = author;
  record.specVersion = block.specVersion;
  const difficulty = await api.query.difficulty.currentDifficulty<U256>();
  record.difficulty = difficulty.toString();
  await record.save();
}

function getEventId(event: SubstrateEvent): string {
  return `${event.block.block.header.number.toString()}-${event.idx.toString()}`;
}

export async function handleEvent(event: SubstrateEvent): Promise<void> {
  const eventId = getEventId(event);
  let record = await Event.get(eventId);
  const relatedAccounts = extractRelatedAccountsFromEvent(event);

  if (record === undefined) {
    record = new Event(eventId);
    record.module = event.event.section;
    record.event = event.event.method;
    record.blockId = event.block.block.header.number.toString();
    record.blockNumber = event.block.block.header.number.unwrap().toNumber();
    record.extrinsicId = event.extrinsic
      ? event.extrinsic.extrinsic.hash.toString()
      : null;
    record.phase = {
      isApplyExtrinsic: event.phase.isApplyExtrinsic,
      isFinalization: event.phase.isFinalization,
      isInitialization: event.phase.isInitialization,
    };
    record.topics = event.topics.map((topic) => topic.toString());
    record.parameters = event.event.data.toString();
    record.timestamp = event.block.timestamp;
    record.relatedAccounts = relatedAccounts;
    await record.save();
  }
  await processEvent(event);
}

export async function processEvent(event: SubstrateEvent): Promise<void> {
  const {
    event: { method, section },
  } = event;
  const eventType = `${section}/${method}`;
  const handlers = eventsMapping[eventType];
  if (handlers) {
    for (let handler of handlers) {
      await handler(event);
    }
  }
}

export async function handleExtrinsic(
  extrinsic: SubstrateExtrinsic
): Promise<void> {
  const thisExtrinsic = await Extrinsic.get(
    extrinsic.extrinsic.hash.toString()
  );
  if (thisExtrinsic === undefined) {
    const record = new Extrinsic(extrinsic.extrinsic.hash.toString());
    record.module = extrinsic.extrinsic.method.section;
    record.call = extrinsic.extrinsic.method.method;
    record.blockId = extrinsic.block.block.header.number.toString();
    record.isSuccess = extrinsic.success;
    record.isSigned = extrinsic.extrinsic.isSigned;
    record.nonce = extrinsic.extrinsic.nonce.toNumber();
    if (extrinsic.extrinsic.isSigned && extrinsic.extrinsic.signer) {
      record.signature = extrinsic.extrinsic.signature.toString();
      const signer = await getOrCreateAccount(
        extrinsic.extrinsic.signer.toString()
      );
      record.signerId = signer.id;
    }
    record.extra = await handleExtrinsicExtra(extrinsic);
    record.version = extrinsic.extrinsic.version;
    record.timestamp = extrinsic.block.timestamp;
    await record.save();
  }
}

async function handleExtrinsicExtra(
  extrinsic: SubstrateExtrinsic
): Promise<ExtrinsicV4> {
  let extrinsicFee: bigint;
  let lifetime: number[] | undefined;
  if (extrinsic.extrinsic.isSigned) {
    extrinsicFee = getExtrinsicFee(extrinsic);
    lifetime = extrinsic.extrinsic.era.isMortalEra
      ? [
          extrinsic.extrinsic.era.asMortalEra.birth(
            extrinsic.block.block.header.number.toNumber()
          ),
          extrinsic.extrinsic.era.asMortalEra.death(
            extrinsic.block.block.header.number.toNumber()
          ),
        ]
      : undefined;
  }
  const extrinsicExtra: ExtrinsicV4 = {
    parameters: extrinsic.extrinsic.method.args.toString(),
    fee: extrinsicFee ? extrinsicFee.toString() : null,
    tip: extrinsic.extrinsic.isSigned
      ? extrinsic.extrinsic.tip.toBigInt().toString()
      : null,
    lifetime: lifetime,
    extension: `{}`,
  };
  return extrinsicExtra;
}

export function getExtrinsicFee(extrinsic: SubstrateExtrinsic): bigint {
  const eventRecord = extrinsic.events.find((event) => {
    return (
      event.event.method === "Withdraw" && event.event.section === "balances"
    );
  });

  if (eventRecord !== undefined) {
    const {
      event: {
        data: [_, fee],
      },
    } = eventRecord;

    return (fee as Balance).toBigInt();
  } else {
    return BigInt(0);
  }
}

export function extractRelatedAccountsFromEvent(
  event: SubstrateEvent
): string[] {
  const accounts: string[] = [];
  for (const [key, typeDef] of Object.entries(event.event.data.typeDef)) {
    if (ACCOUNT_TYPES.includes(typeDef.type)) {
      const index = Number(key);
      accounts.push(event.event.data[index].toString());
    }
  }
  let extrinsic = event.extrinsic ? event.extrinsic.extrinsic : null;
  if (!extrinsic) {
    return uniq(accounts);
  }
  let signer = extrinsic.signer;
  if (extrinsic.isSigned && signer) {
    accounts.push(signer.toString());
  }
  return uniq(accounts);
}

export async function getOrCreateAccount(accountId: string): Promise<Account> {
  let account = await Account.get(accountId);
  if (account === undefined) {
    account = new Account(accountId);
    account.pubKey = u8aToHex(decodeAddress(accountId));
  }
  if (!api.query.system.account) {
    account.nextNonce = 0;
  } else {
    const { nonce } = await api.query.system.account(accountId);
    account.nextNonce = nonce ? nonce.toNumber() : 0;
  }
  await account.save();
  return account;
}
