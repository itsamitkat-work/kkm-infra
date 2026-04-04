import { type Filter, type FilterFieldConfig } from '@/components/ui/filters';

export function applyAdvancedFilters<T extends Record<string, unknown>>(
  data: T[],
  appliedFilters: Filter[],
  filterConfig: FilterFieldConfig[]
): T[] {
  if (appliedFilters.length === 0) {
    return data;
  }

  return data.filter((item) => {
    return appliedFilters.every((filter) => {
      const { field: fieldKey, operator, values } = filter;
      const itemValue = item[fieldKey];
      const fieldConfig = filterConfig.find((f) => f.key === fieldKey);

      if (!fieldConfig) {
        return true;
      }

      if (operator === 'empty') {
        return (
          itemValue === null ||
          itemValue === undefined ||
          String(itemValue).trim() === ''
        );
      }
      if (operator === 'not_empty') {
        return (
          itemValue !== null &&
          itemValue !== undefined &&
          String(itemValue).trim() !== ''
        );
      }

      if (itemValue === null || itemValue === undefined) {
        return false;
      }

      const V = (val: unknown) => ({
        asString: String(val).toLowerCase(),
        asNumber:
          val === '' || val === null || val === undefined ? NaN : Number(val),
        asDate:
          val === '' || val === null || val === undefined
            ? new Date(NaN)
            : new Date(String(val)),
        asBoolean: !!val,
      });

      const IV = V(itemValue);
      if (values.length === 0) return true;

      const FVV = values.map((v) => V(v));

      switch (fieldConfig.type) {
        case 'text':
        case 'email':
        case 'url':
        case 'tel':
          switch (operator) {
            case 'contains':
              return IV.asString.includes(FVV[0].asString);
            case 'not_contains':
              return !IV.asString.includes(FVV[0].asString);
            case 'starts_with':
              return IV.asString.startsWith(FVV[0].asString);
            case 'ends_with':
              return IV.asString.endsWith(FVV[0].asString);
            case 'is':
              return IV.asString === FVV[0].asString;
            default:
              return true;
          }

        case 'select':
          switch (operator) {
            case 'is':
              return String(itemValue) === String(values[0]);
            case 'is_not':
              return String(itemValue) !== String(values[0]);
            default:
              return true;
          }

        case 'multiselect': {
          const strValues = values.map(String);
          switch (operator) {
            case 'is_any_of':
              return strValues.includes(String(itemValue));
            case 'is_not_any_of':
              return !strValues.includes(String(itemValue));
            default:
              return true;
          }
        }
        case 'number':
          if (FVV.some((v) => isNaN(v.asNumber))) return true;
          switch (operator) {
            case 'equals':
              return IV.asNumber === FVV[0].asNumber;
            case 'not_equals':
              return IV.asNumber !== FVV[0].asNumber;
            case 'greater_than':
              return IV.asNumber > FVV[0].asNumber;
            case 'less_than':
              return IV.asNumber < FVV[0].asNumber;
            case 'between':
              return (
                IV.asNumber >= FVV[0].asNumber && IV.asNumber <= FVV[1].asNumber
              );
            default:
              return true;
          }

        case 'date': {
          if (FVV.some((v) => isNaN(v.asDate.getTime()))) return true;
          const itemDate = IV.asDate;
          switch (operator) {
            case 'before':
              return itemDate < FVV[0].asDate;
            case 'after':
              return itemDate > FVV[0].asDate;
            case 'is':
              return itemDate.toDateString() === FVV[0].asDate.toDateString();
            case 'is_not':
              return itemDate.toDateString() !== FVV[0].asDate.toDateString();
            default:
              return true;
          }
        }
        case 'daterange': {
          if (FVV.some((v) => isNaN(v.asDate.getTime()))) return true;
          const itemDateForRange = IV.asDate;
          switch (operator) {
            case 'between':
              if (!values[0] || !values[1]) return true;
              return (
                itemDateForRange >= FVV[0].asDate &&
                itemDateForRange <= FVV[1].asDate
              );
            case 'not_between':
              if (!values[0] || !values[1]) return true;
              return (
                itemDateForRange < FVV[0].asDate ||
                itemDateForRange > FVV[1].asDate
              );
            default:
              return true;
          }
        }
        case 'boolean':
          switch (operator) {
            case 'is':
              return IV.asBoolean === FVV[0].asBoolean;
            case 'is_not':
              return IV.asBoolean !== FVV[0].asBoolean;
            default:
              return true;
          }

        default:
          return true;
      }
    });
  });
}
