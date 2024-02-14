import exceljs from 'exceljs';
import path from 'path';
import fs from 'fs';
import { safeToString, writeFileSync } from './utils';
import { sheetToEnums } from './to-enum';
import { TypeStruct, convertSignatureToJson } from './type-parser';
import { convertValueByType } from './coverter';

function getField(cellValue: any) {
  return safeToString(cellValue);
}

function toSchema({ fileds, signatures, enums }: { fileds: exceljs.Row; signatures: exceljs.Row; enums?: Record<string, any> }) {
  let schema: Record<string, { signature: string; type: TypeStruct }> = {};
  const filedValues = fileds.values as string[];
  const signatureValues = signatures.values as string[];
  filedValues.forEach((x, i) => {
    let filed = getField(x);
    if (!filed) {
      return;
    }
    if (filed in schema) {
      throw { message: `字段重复: ${filed}！` };
    }
    const signature = safeToString(signatureValues[i]);
    schema[filed] = {
      signature,
      type: convertSignatureToJson(signature, { enums, types: {} }),
    };
  });
  return schema;
}

/** 将数据转为 json */
function sheetToJson(sheet: exceljs.Worksheet, { enums }: { enums?: Record<string, any> }) {
  // const titles = sheet.getRow(1);
  const fileds = sheet.getRow(2);
  const signatures = sheet.getRow(3);
  const schema = toSchema({ fileds, signatures, enums });
  const records: any[] = [];
  sheet.eachRow((row, i) => {
    if (i <= 3) return;
    let data: Record<string, any> = {};
    row.eachCell({ includeEmpty: true }, (x, no) => {
      const filed = getField(fileds.getCell(no).value);
      const signature = schema[filed]?.signature;
      const type = schema[filed]?.type;
      if (type?.type === 'comment') {
        return;
      }
      if (filed) {
        try {
          data[filed] = convertValueByType({
            type,
            value: x.value,
            enums,
          });
        } catch (err: any) {
          if (err?.message) {
            err.message = `位置 ${x.address}, 签名「${signature}」, 错误信息: ${err.message}`;
          }
          throw err;
        }
      }
    });
    records.push(data);
  });
  return {
    schema,
    records,
  };
}

export async function excelToJson({ entry, output, debugMode }: { entry: string; output?: string; debugMode?: boolean }) {
  if (debugMode) {
    console.log();
    console.log('[excelbp] --- debugMode on ---');
  }

  const entryPath = path.resolve(entry);
  if (!fs.existsSync(entryPath)) {
    throw { message: `entry is not exist: ${entry}` };
  }

  let outPath = '';
  if (output) {
    outPath = path.resolve(output);
    if (!fs.existsSync(outPath)) {
      throw { message: `output is not exist: ${output}` };
    }
  } else {
    outPath = path.join(path.dirname(entryPath), path.basename(entryPath, path.extname(entryPath)) + '.json');
  }

  const workbook = new exceljs.Workbook();
  const xlsx = await workbook.xlsx.readFile(entryPath);
  const skillSheet = xlsx.worksheets[0];
  console.log(`----[sheet]---`, skillSheet);
  const enumSheet = xlsx.getWorksheet('enum');
  if (!skillSheet) {
    return;
  }
  const { enums } = sheetToEnums(enumSheet) || {};
  console.log(`----[enum]---`, enumSheet, enums);
  const result = sheetToJson(skillSheet, { enums });
  const json = {
    ...result,
    enums,
  };
  writeFileSync(outPath, JSON.stringify(json, null, 2));
}
