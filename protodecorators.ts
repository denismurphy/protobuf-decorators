import 'reflect-metadata';
import { ProtoType } from './prototypes';

export const PROTO_METADATA_KEY = 'proto:fields';
export const PROTO_CONTRACT_KEY = 'proto:contract';

interface ProtoMemberOptions {
  id: number;
  name?: string;
  type: ProtoType;
  messageType?: Function;
}

interface ProtoContractOptions {
  name?: string;
}

export function ProtoMember(options: ProtoMemberOptions) {
  return function(target: any, propertyKey: string) {
    const existingFields = Reflect.getMetadata(PROTO_METADATA_KEY, target) || {};
    existingFields[propertyKey] = options;
    Reflect.defineMetadata(PROTO_METADATA_KEY, existingFields, target);
  };
}

export function ProtoContract(options: ProtoContractOptions = {}) {
  return function(constructor: Function) {
    Reflect.defineMetadata(PROTO_CONTRACT_KEY, options, constructor);
  };
}