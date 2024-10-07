import * as protobuf from 'protobufjs';
import { PROTO_CONTRACT_KEY, PROTO_METADATA_KEY } from './protodecorators';
import { ProtoType } from './prototypes';

interface ProtoFieldOptions {
  id: number;
  name?: string;
  type: ProtoType;
  messageType?: Function;
}

export class Serialiser {
  private static root: protobuf.Root = new protobuf.Root();

  private static getOrCreateProtoType<T extends object>(messageType: new () => T): protobuf.Type {
    const contractOptions = Reflect.getMetadata(PROTO_CONTRACT_KEY, messageType) || {};
    const typeName = contractOptions.name || messageType.name;
    let type = this.root.lookupType(typeName);

    if (!type) {
      type = new protobuf.Type(typeName);
      const fields = Reflect.getMetadata(PROTO_METADATA_KEY, messageType.prototype) || {};
      
      for (const [prop, fieldOptions] of Object.entries(fields)) {
        const { id, name, type: protoType, messageType: fieldMessageType } = fieldOptions as ProtoFieldOptions;
        const rule = protoType === ProtoType.Repeated ? 'repeated' : undefined;
        const resolvedType = this.resolveProtoType(protoType, fieldMessageType);
        type.add(new protobuf.Field(name || prop, id, resolvedType, rule));
      }

      this.root.add(type);
    }

    return type;
  }

  private static resolveProtoType(protoType: ProtoType, messageType?: Function): string {
    switch (protoType) {
      case ProtoType.Int32:
      case ProtoType.Enum:
        return 'int32';
      case ProtoType.Int64: return 'int64';
      case ProtoType.Double: return 'double';
      case ProtoType.String: return 'string';
      case ProtoType.Bool: return 'bool';
      case ProtoType.Bytes: return 'bytes';
      case ProtoType.Message:
        if (!messageType) throw new Error('Message type must be provided for ProtoType.Message');
        const contractOptions = Reflect.getMetadata(PROTO_CONTRACT_KEY, messageType) || {};
        const typeName = contractOptions.name || (messageType as Function).name;
        this.getOrCreateProtoType(messageType as new () => object);
        return typeName;
      case ProtoType.Repeated:
        if (!messageType) throw new Error('Element type must be provided for ProtoType.Repeated');
        return this.resolveProtoType(ProtoType.Message, messageType);
      default:
        throw new Error(`Unsupported ProtoType: ${protoType}`);
    }
  }

  public static serialise<T extends object>(message: T): Uint8Array {
    const messageType = message.constructor as new () => T;
    if (!Reflect.getMetadata(PROTO_CONTRACT_KEY, messageType)) {
      throw new Error(`${messageType.name} is not decorated with @ProtoContract`);
    }

    const type = this.getOrCreateProtoType(messageType);
    const errMsg = type.verify(message as { [k: string]: any });
    if (errMsg) throw Error(errMsg);
    const buffer = type.encode(message as protobuf.Message<{}>).finish();
    return buffer;
  }

  public static deserialise<T extends object>(buffer: Uint8Array, messageType: new () => T): T {
    if (!Reflect.getMetadata(PROTO_CONTRACT_KEY, messageType)) {
      throw new Error(`${messageType.name} is not decorated with @ProtoContract`);
    }

    const type = this.getOrCreateProtoType(messageType);
    const message = type.decode(buffer) as T;
    return message;
  }
}