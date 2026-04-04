export interface ItemJustification {
  itemName: string | null;
  id: string;
  srNo: number;
  itemId: string;
  basicRateId: string | null;
  dsrid: string | undefined;
  itemCode: string;
  code: string;
  description: string;
  unit: string;
  rate: number;
  quantity: number;
  amount: number;
  calcFor: number;
}
