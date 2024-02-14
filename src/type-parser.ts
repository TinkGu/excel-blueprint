import { isEndWith, isStartWith, trim } from './utils';

// ## 基础类型
// * int
// * float
// * string
// * bool
// * int[]
// * bool[]
// * float[]
// * string[]
// * comment

// ## 选填
// 类型最后加 ? 表示必填

// ## 自定义类型 `t<x>`
// 比如类型为 `t<xxx>`，其中 xxx 表示实际的类型，需要提前注册该类型对应的数据解析方式，最后导表时总是返回一个 json 结构体。
// 比如 `t<Vector>`，可以配置 `0,1`

// ## 枚举类型 `e<x>`

// ## 数组语法
// * 比如类型为 `int[]`，则可以配置值 `1,2`。每一项使用逗号分割。
// * 嵌套数组，比如类型为 `int[][]`，则可以配置为 `[1,2],[1,2]`。每一项使用数组标记 `[]` 包裹起来
// * 混合复杂类型，比如类型为 `t<Vector>[]`，则可以配置为 `[1,2],[1,2]`。每一项使用 `()` 包裹起来，再把括号内的内容传递给 vector

// ## tuple 语法
// * 比如类型为 `int,string,int[]` 表示可以配置 `1,我的,[1,2]`。每一项逗号分割。
// 若想表示可选，`int,string.int[],?` 最后追加一个 ? 元素即可

export interface TypeStruct {
  type: string;
  children?: TypeStruct[];
  isCustom?: number;
  isEnum?: number;
  optional?: number;
}

export enum TypeKind {
  tuple = 'tuple',
  list = 'list',
  custom = 'custom',
}

function isOptional(x?: string) {
  if (!x) {
    return false;
  }

  return x[x.length - 1] === '?';
}

function extractEnumName(x: string) {
  if (!x) return '';
  const match = x.match(/e<(.*)>/);
  return match?.[1] || '';
}

function extractCustomTypeName(x: string) {
  if (!x) return '';
  const match = x.match(/t<(.*)>/);
  return match?.[1] || '';
}

const BASE_TYPES = ['int', 'float', 'double', 'string', 'comment', 'bool'];
const OPTIONAL_BASE_TYPES = BASE_TYPES.map((x) => x + '?');
const ALL_BASE_TYPES = [...BASE_TYPES, ...OPTIONAL_BASE_TYPES];

/** 把类型签名转换成 json 数据 */
export function convertSignatureToJson(
  signature: string,
  options?: {
    optional?: boolean;
    enums?: Record<string, 1>;
    types?: Record<string, 1>;
  },
): TypeStruct {
  const { optional: preOptional, ...nextOptions } = options || {};
  signature = trim(signature);
  const node = { type: '', children: [] } as TypeStruct;
  if (preOptional) node.optional = 1;
  // tuple 语法优先级最高
  const isTuple = signature.includes(',');
  if (isTuple) {
    const tuples = signature.split(',').filter((x) => !!x);
    const optional = trim(tuples[tuples.length - 1]) === '?';
    // 处理 x,? 这种情况，实际只有一个元素，则不是元组
    if (tuples.length === 2 && optional) {
      return convertSignatureToJson(tuples[0], { optional, ...nextOptions });
    }
    node.type = TypeKind.tuple;
    optional && (node.optional = 1);
    tuples.forEach((x) => {
      if (x === '?') {
        return;
      }
      const child = convertSignatureToJson(x, nextOptions);
      node.children?.push(child);
    });
    return node;
  }

  // 数组语法检测
  const isList = isEndWith(signature, '[]') || isEndWith(signature, '[]?');
  if (isList) {
    const optional = isOptional(signature);
    node.type = TypeKind.list;
    optional && (node.optional = 1);
    const sig = signature.slice(0, signature.length - (optional ? 3 : 2));
    const child = convertSignatureToJson(sig, nextOptions);
    node.children?.push(child);
    return node;
  }

  const isNestType = isEndWith(signature, '>') || isEndWith(signature, '>?');
  if (isNestType) {
    const optional = isOptional(signature);
    const isCustom = isStartWith(signature, 't<');
    const isEnum = isStartWith(signature, 'e<');
    if (!isCustom && !isEnum) {
      throw { message: `类型签名不合法，${signature}` };
    }

    optional && (node.optional = 1);
    if (isCustom) {
      node.isCustom = 1;
      node.type = extractCustomTypeName(signature);
      if (options?.types && !(node.type in options.types)) {
        throw { message: `自定义类型「${node.type}」未注册` };
      }
    }

    if (isEnum) {
      node.isEnum = 1;
      node.type = extractEnumName(signature);
      if (options?.enums && !(node.type in options.enums)) {
        throw { message: `枚举「${node.type}」未注册` };
      }
    }

    if (!node.type) {
      throw { message: `类型签名不合法，${signature}` };
    }

    if (/[,\[\]<>;]/.test(node.type)) {
      throw { message: `类型签名不合法，${signature}` };
    }
    return node;
  }

  // 基本类型
  if (ALL_BASE_TYPES.includes(signature)) {
    const optional = isOptional(signature);
    node.type = optional ? signature.slice(0, signature.length - 1) : signature;
    optional && (node.optional = 1);
    return node;
  }

  // 不匹配任何一种规则，抛出解析错误
  throw { message: `类型签名不合法，${signature}` };
}
