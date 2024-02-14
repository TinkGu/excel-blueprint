import { JSONValue } from './type';
import { TypeKind, TypeStruct } from './type-parser';
import { isCellEmpty, safeToString, trim } from './utils';

/** 解析表达式 */
export function parseExp(input: string) {
  let stack: any[] = [];
  let result: string[] = [];
  let token = '';

  for (let i = 0; i < input.length; i++) {
    let char = input[i];
    if (char === '[') {
      stack.push(result);
      result = [];
    } else if (char === ']') {
      const parent = stack.pop();
      if (!parent) {
        throw { message: '表达式非法' };
      }
      if (token.length > 0) {
        result.push(trim(token));
        token = '';
      }
      parent.push(result);
      result = parent;
    } else if (char === ',') {
      if (token.length > 0 || input[i - 1] === ',' || i === 0) {
        result.push(trim(token));
        token = '';
      }
    } else {
      token += char;
    }
  }

  if (token.length > 0) {
    result.push(trim(token));
  }

  return result;
}

export function convertValueByType({ value, type, enums }: { value: any; type: TypeStruct; enums?: Record<string, any> }): JSONValue {
  if (isCellEmpty(value)) {
    if (type.optional) {
      return null;
    } else {
      throw { message: `值不能为空` };
    }
  }

  const kind = type.type;
  if (kind === 'string') {
    return safeToString(value);
  }

  if (kind === 'int' || kind === 'float' || kind === 'double') {
    const v = Number(value);
    if (Number.isNaN(v)) {
      throw { message: '值非法' };
    }
    return v;
  }

  if (kind === 'bool') {
    const v = Number(value);
    if (v !== 1 && v !== 0) {
      throw { message: '值非法' };
    }
    return v;
  }

  if (type.isEnum) {
    if (!enums) throw { message: '缺少枚举表' };
    const enumValues = enums[type.type];
    if (!enumValues) throw { message: `枚举类型不存在 ${type.type}` };
    const ev = enumValues[value];
    if (!ev) throw { message: `枚举值不存在 ${type.type}.${value}` };
    return ev;
  }

  if (kind === TypeKind.list) {
    // 解析好的数据，第二次遍历的时候可以直接使用
    const list = typeof value === 'string' ? parseExp(value) : (value as string[]);
    if (!list?.map) throw { message: '值非法' };
    if (!type.children?.length) throw { message: '类型非法' };
    const childType = type.children[0];
    return list.map((x) => convertValueByType({ value: x, type: childType, enums }));
  }

  // TODO: 签名 string,int[] 遇到 x,1,2 会被解析 ['x', '1']，应当 throw
  if (kind === TypeKind.tuple) {
    // 解析好的数据，第二次遍历的时候可以直接使用
    const tuple = typeof value === 'string' ? parseExp(value) : value;
    if (!type.children?.length) throw { message: '类型非法' };
    // 如果签名是 x,x?,x? 也就是除了第一项以外，其它都是选填，那就说明该类型可以接受单个值
    const isAllowSingleValue = type.children.every((x, i) => (i > 0 ? x.optional === 1 : true));
    const isStrOrNum = typeof tuple === 'string' || typeof tuple === 'number';
    if (isStrOrNum && isAllowSingleValue) {
      const firstType = type.children[0];
      return [convertValueByType({ value: tuple, type: firstType, enums })];
    }
    if (!tuple?.map) throw { message: '值非法' };
    return type.children.map((childType, i) => {
      return convertValueByType({ value: tuple[i], type: childType, enums });
    });
  }

  return value;
}
