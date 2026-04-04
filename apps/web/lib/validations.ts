import { parse, isValid, parseISO } from 'date-fns';

export const validDateFormat = (val: string | undefined): boolean => {
  if (!val || val.trim() === '') return true;

  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return isValid(parseISO(val));
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
    const parsedDate = parse(val, 'dd/MM/yyyy', new Date());
    return isValid(parsedDate);
  }

  return false;
};
