// Auto-generated , DO NOT EDIT
import {Entity, FunctionPropertyNames} from "@subql/types";
import assert from 'assert';




type BlockProps = Omit<Block, NonNullable<FunctionPropertyNames<Block>>>;

export class Block implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public hash: string;

    public number: number;

    public timestamp: Date;

    public author?: string;

    public specVersion: number;

    public difficulty: string;

    public parentHash: string;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save Block entity without an ID");
        await store.set('Block', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove Block entity without an ID");
        await store.remove('Block', id.toString());
    }

    static async get(id:string): Promise<Block | undefined>{
        assert((id !== null && id !== undefined), "Cannot get Block entity without an ID");
        const record = await store.get('Block', id.toString());
        if (record){
            return Block.create(record as BlockProps);
        }else{
            return;
        }
    }


    static async getByHash(hash: string): Promise<Block[] | undefined>{
      
      const records = await store.getByField('Block', 'hash', hash);
      return records.map(record => Block.create(record as BlockProps));
      
    }

    static async getByNumber(number: number): Promise<Block[] | undefined>{
      
      const records = await store.getByField('Block', 'number', number);
      return records.map(record => Block.create(record as BlockProps));
      
    }

    static async getByTimestamp(timestamp: Date): Promise<Block[] | undefined>{
      
      const records = await store.getByField('Block', 'timestamp', timestamp);
      return records.map(record => Block.create(record as BlockProps));
      
    }


    static create(record: BlockProps): Block {
        assert(typeof record.id === 'string', "id must be provided");
        let entity = new Block(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
