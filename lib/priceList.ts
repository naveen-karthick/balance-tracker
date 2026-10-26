export type PriceItem = {
  code: string;
  name: string;
  usage: string;
  rate: string;
};

/** Jayam Agency price list, including the handwritten additions on the sheet. */
export const PRICE_LIST: PriceItem[] = [
  { code: "0001", name: "Plastic Round Plate Washer", usage: "JF7090 Study Desk", rate: "1.20" },
  { code: "0002", name: "Handle Leg Bush Big Size", usage: "JF7090 Study Desk, Storage Cot Leg", rate: "3.00" },
  { code: "0003", name: "Rubber Bush", usage: "JF7090 Study Desk", rate: "1.50" },
  { code: "0005", name: "Swing leg bush", usage: "JF1210 Swing", rate: "0.90" },
  { code: "0007", name: "Small Dining Bush", usage: "Bunker Cot Bush for Ladder", rate: "0.90" },
  { code: "0009", name: "Bunker Top Bush", usage: "Bunker Cot", rate: "4.20" },
  { code: "0011", name: "Bunker Bottom Bush", usage: "Bunker Cot", rate: "3.00" },
  { code: "0012", name: "Dining Bottom Bush", usage: "JF1515 Chair and JF7020", rate: "0.90" },
  { code: "0013", name: "Small Bush", usage: "JF7060 Top", rate: "0.90" },
  { code: "0014", name: "Bottom Cross Bush", usage: "", rate: "3.00" },
  { code: "0015", name: '1" x 1" Square bush', usage: "JF7090 Study desk, JF1400", rate: "1.20" },
  { code: "0016", name: '1 1/2" x 1 1/2" Square Bush', usage: "JF1210 Swing, JF1020", rate: "3.00" },
  { code: "0017", name: "Dining Top Bush", usage: "JF5240", rate: "0.90" },
  { code: "0018", name: "Small Thread Bush", usage: "JF7090", rate: "4.75" },
  { code: "0019", name: "Plastic Button", usage: "LEC", rate: "1.20" },
  { code: "0020", name: "Plastic Big Gear", usage: "", rate: "23.50" },
  { code: "0021", name: "Big Thread Bush", usage: "JF1515 Stem", rate: "4.80" },
  { code: "0022", name: "Big Nut Bush", usage: "JF1515 Stem", rate: "4.80" },
  { code: "0024", name: "JF-1124 Study Chair Bush", usage: "JF7060", rate: "1.20" },
  { code: "0025", name: "Plastic Gear Small", usage: "JF7020", rate: "23.50" },
  { code: "0028", name: "8 MM Nylon bush for sliding", usage: "LEC", rate: "3.00" },
  { code: "0029", name: "16 MM Nylon bush for sliding", usage: "LEC", rate: "3.00" },
  { code: "0031", name: '1 1/2" x 3/4" bush thick (204)', usage: "JF1020, JF1130, JF7080-4 Nos", rate: "3.00" },
  { code: "0032", name: "3/4 inner bush (210)", usage: "JF7060", rate: "0.60" },
  { code: "0041", name: "Bunker Top Bush 2 Inch", usage: "Bunker Top Bush 2 Inch", rate: "3.60" },
  { code: "0043", name: "Thread Leg Key Bush", usage: "", rate: "3.00" },
  { code: "0044", name: "1 Inch Bush Laptop Table", usage: "1 Inch Bush Laptop Table", rate: "2.00" },
  { code: "0045", name: "Yoga Chair Gear", usage: "Yoga Chair Gear", rate: "30.00" },
  { code: "0046", name: '3/4" Square Bush', usage: "JF7015, JF5240", rate: "3.50" },
  { code: "0051", name: "Nylon Wheel", usage: "Nylon Wheel", rate: "5.00" },
  { code: "", name: "White Gear", usage: "", rate: "10.00" },
];

function codeKey(code: string): string {
  return code.replace(/^0+/, "");
}

export function findPrice(query: string): PriceItem | undefined {
  const trimmed = query.trim();
  if (!trimmed) return undefined;

  const byName = PRICE_LIST.find((item) => item.name.toLowerCase() === trimmed.toLowerCase());
  if (byName) return byName;

  const byCode = PRICE_LIST.find((item) => item.code !== "" && item.code.toLowerCase() === trimmed.toLowerCase());
  if (byCode) return byCode;

  if (!/^\d+$/.test(trimmed)) return undefined;
  const key = codeKey(trimmed);
  if (!key) return undefined;
  const matches = PRICE_LIST.filter((item) => item.code !== "" && codeKey(item.code) === key);
  return matches.length === 1 ? matches[0] : undefined;
}

export function filterPriceList(query: string): PriceItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return PRICE_LIST;
  const key = trimmed.replace(/^0+/, "");
  return PRICE_LIST.filter((item) => {
    const haystack = `${item.code} ${item.name} ${item.usage}`.toLowerCase();
    if (haystack.includes(trimmed)) return true;
    return key !== "" && codeKey(item.code) === key;
  });
}
