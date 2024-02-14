import exceljs from 'exceljs';
import { isCellEmpty, safeToString } from './utils';
import { JSONValue } from './type';

export function sheetToEnums(sheet?: exceljs.Worksheet) {
  if (!sheet) {
    return;
  }
  const columnCount = sheet.columnCount;
  if (!columnCount) {
    return;
  }
  const enums: Record<string, JSONValue> = {};
  const schemas: Record<string, JSONValue> = {};
  for (let i = 1; i <= columnCount; i++) {
    const column = sheet.getColumn(i);
    const firstCell = sheet.getCell(1, i);
    if (isCellEmpty(firstCell.value)) {
      continue;
    }
    let key = '';
    let type = 'int';
    let schema = {
      name: '',
      type,
      columns: [] as string[],
      values: [] as JSONValue[],
    };
    let data = {} as Record<string, JSONValue>;
    column.eachCell((x, no) => {
      if (no === 1) {
        // 第一行，默认是中文说明
        return;
      }

      if (no === 2) {
        key = safeToString(x.value);
        if (!key) throw { message: `enum 名称不得为空：位置=${x.address}` };
        return;
      }

      if (no === 3) {
        if (isCellEmpty(x)) {
          type = 'int';
        }
        type = safeToString(x.value);
        schema.type = type;
        return;
      }

      const dataKey = safeToString(x.value);
      schema.columns.push(dataKey);
      if (type === 'int') {
        data[dataKey] = no - 3;
      }

      if (type === 'string') {
        data[dataKey] = dataKey;
      }
      schema.values.push(data[dataKey]);
    });
    enums[key] = data;
    schema.name = key;
    schemas[schema.name] = schema;
  }
  return {
    enums,
    schemas,
  };
}
