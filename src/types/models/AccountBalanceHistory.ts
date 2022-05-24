// Auto-generated , DO NOT EDIT
import {Entity, FunctionPropertyNames} from "@subql/types";
import assert from 'assert';




type AccountBalanceHistoryProps = Omit<AccountBalanceHistory, NonNullable<FunctionPropertyNames<AccountBalanceHistory>>>;

export class AccountBalanceHistory implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public accountId: string;

    public freeAmount: bigint;

    public reservedAmount: bigint;

    public feeFrozen: bigint;

    public miscFrozen: bigint;

    public timestamp: Date;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save AccountBalanceHistory entity without an ID");
        await store.set('AccountBalanceHistory', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove AccountBalanceHistory entity without an ID");
        await store.remove('AccountBalanceHistory', id.toString());
    }

    static async get(id:string): Promise<AccountBalanceHistory | undefined>{
        assert((id !== null && id !== undefined), "Cannot get AccountBalanceHistory entity without an ID");
        const record = await store.get('AccountBalanceHistory', id.toString());
        if (record){
            return AccountBalanceHistory.create(record as AccountBalanceHistoryProps);
        }else{
            return;
        }
    }


    static async getByAccountId(accountId: string): Promise<AccountBalanceHistory[] | undefined>{
      
      const records = await store.getByField('AccountBalanceHistory', 'accountId', accountId);
      return records.map(record => AccountBalanceHistory.create(record as AccountBalanceHistoryProps));
      
    }

    static async getByTimestamp(timestamp: Date): Promise<AccountBalanceHistory[] | undefined>{
      
      const records = await store.getByField('AccountBalanceHistory', 'timestamp', timestamp);
      return records.map(record => AccountBalanceHistory.create(record as AccountBalanceHistoryProps));
      
    }


    static create(record: AccountBalanceHistoryProps): AccountBalanceHistory {
        assert(typeof record.id === 'string', "id must be provided");
        let entity = new AccountBalanceHistory(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
