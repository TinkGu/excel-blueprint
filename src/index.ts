import path from 'path';
import exceljs from 'exceljs';
import { safeToString } from './utils';
import { sheetToEnums } from './to-enum';
import { convertSignatureToJson } from './type-parser';
import { convertValueByType } from './coverter';

const XLSX_FILE_PATH = path.resolve(__dirname, '../excel.xlsx');
const workbook = new exceljs.Workbook();

function getField(cellValue: any) {
  return safeToString(cellValue);
}

function toSchema({
  fileds,
  signatures,
  enums,
}: {
  fileds: exceljs.Row;
  signatures: exceljs.Row;
  enums?: Record<string, any>;
}) {
  let schema = {};
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
function sheetToJson(
  sheet: exceljs.Worksheet,
  { enums }: { enums?: Record<string, any> }
) {
  // const titles = sheet.getRow(1);
  const fileds = sheet.getRow(2);
  const signatures = sheet.getRow(3);
  const schema = toSchema({ fileds, signatures, enums });
  const records: any[] = [];
  sheet.eachRow((row, i) => {
    if (i <= 3) return;
    let data = {};
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
        } catch (err) {
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

async function main() {
  try {
    const xlsx = await workbook.xlsx.readFile(XLSX_FILE_PATH);
    const skillSheet = xlsx.worksheets[0];
    const enumSheet = xlsx.getWorksheet('enum');
    if (!skillSheet) {
      return;
    }
    const { enums } = sheetToEnums(enumSheet) || {};
    // console.log('enums', enums);
    const json = sheetToJson(skillSheet, { enums });
    console.log('json', json);
  } catch (err) {
    console.error(err);
  }
}

main();
