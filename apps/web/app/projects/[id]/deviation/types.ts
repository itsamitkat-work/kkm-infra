export type DeviationReportType = 'GENvsEST' | 'GENvsMSR' | 'ESTvsMSR';

export type DeviationResponse = {
  srNo: string | number;
  type: DeviationReportType;
  name: string;
  rate: number;
  quantity1: number;
  quantity2: number;
};
