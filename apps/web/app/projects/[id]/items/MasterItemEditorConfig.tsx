import { ProjectItemRowType } from '@/types/project-item';
import { Combobox } from '@/components/ui/combobox';
import {
  MasterItemOption,
  mapMasterItemToOption,
  renderMasterItemOption,
  useMasterItemOptions,
} from '../components/master-item-options';
import { useMasterProjectItemsQuery } from '@/app/(app)/projects/hooks/use-master-project-items-query';
import React from 'react';
import { useClients } from '@/hooks/clients/use-clients';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useMasterItemSelection } from './use-master-item-selection';

/**
 * Configuration for a master item editor column
 */
export interface MasterItemEditorConfigType {
  placeholder: string;
  searchPlaceholder: string;
  searchField: 'code' | 'name';
  getOptionLabel?: (option: MasterItemOption) => string;
  renderSelectedValue: (
    option: MasterItemOption | null,
    placeholder: string,
    rowValue?: string
  ) => React.ReactNode;
  getOnChangeValue: (option: MasterItemOption | null) => string;
  getRowValue: (row: ProjectItemRowType) => string;
}

interface MasterItemEditorProps {
  row: ProjectItemRowType;
  config: MasterItemEditorConfigType;
  onChange?: (value: unknown) => void;
  autoFocus?: boolean;
}

/**
 * MasterItemEditorConfig - A reusable editor component for selecting master items
 * by code or name. Handles the complexity of cross-column synchronization.
 */
export const MasterItemEditorConfig = ({
  config,
  row,
  onChange,
  autoFocus = false,
}: MasterItemEditorProps) => {
  const { debouncedSearchTerm, setSearchTerm } = useDebouncedSearch();
  const [scheduleName, setScheduleName] = React.useState<string | undefined>();
  const { setSelection, getSelection } = useMasterItemSelection(row.id);

  // Fetch master items based on search
  const {
    data: masterProjectItems,
    fetchNextPage: fetchNextMasterProjectItems,
    hasNextPage: hasNextMasterProjectItems,
    isFetchingNextPage: isFetchingNextMasterProjectItems,
    isLoading: isLoadingMasterProjectItems,
  } = useMasterProjectItemsQuery(
    { search: debouncedSearchTerm, searchField: config.searchField },
    scheduleName
  );

  const masterItemOptions = useMasterItemOptions(masterProjectItems);

  // Get the stored master item (if selected in another column)
  const storedMasterItem = getSelection();

  // Ensure stored master item is in options list for display
  const optionsWithStoredItem = React.useMemo(() => {
    if (!storedMasterItem) {
      return masterItemOptions;
    }

    const existsInOptions = masterItemOptions.some(
      (opt) => opt.hashId === storedMasterItem.hashId
    );

    if (!existsInOptions) {
      return [...masterItemOptions, mapMasterItemToOption(storedMasterItem)];
    }

    return masterItemOptions;
  }, [masterItemOptions, storedMasterItem]);

  // Find the option that matches the current row's masterItemHashId
  const matchedOption = React.useMemo(() => {
    if (!row.masterItemHashId) {
      return null;
    }
    return (
      optionsWithStoredItem.find(
        (option) => option.hashId === row.masterItemHashId
      ) ?? null
    );
  }, [optionsWithStoredItem, row.masterItemHashId]);

  // Determine the effective option to display (matched or stored)
  const effectiveOption = React.useMemo(() => {
    return (
      matchedOption ||
      (storedMasterItem ? mapMasterItemToOption(storedMasterItem) : null)
    );
  }, [matchedOption, storedMasterItem]);

  const comboboxValue = effectiveOption?.hashId ?? row.masterItemHashId ?? '';

  // Schedule filter handling
  const handleScheduleFilterChange = React.useCallback(
    (scheduleId: string | null) => {
      setScheduleName(scheduleId ?? undefined);
    },
    []
  );

  const { data: clients } = useClients({
    search: debouncedSearchTerm,
    searchField: config.searchField,
  });

  const scheduleFilterOptions = React.useMemo(
    () =>
      Array.from(new Set(clients.map((client) => client.scheduleName))).map(
        (label) => ({ id: label, label })
      ),
    [clients]
  );

  // Handle selection change
  const handleChange = React.useCallback(
    (optionId: string, option: MasterItemOption) => {
      // Store the selected master item for use in onChangeUpdateRow
      setSelection(option.raw);

      // Get the value to set for this specific column (code or name)
      const newValue = config.getOnChangeValue(option);

      // Trigger the onChange callback
      onChange?.(newValue);
    },
    [setSelection, config, onChange]
  );

  // Render the selected value with fallbacks
  const renderSelectedValue = React.useCallback(
    (option: MasterItemOption | null) => {
      // Use the option if available, otherwise fall back to effective option or row value
      const optionToRender = option || effectiveOption;
      const rowValue = config.getRowValue(row);

      return config.renderSelectedValue(
        optionToRender,
        config.placeholder,
        rowValue
      );
    },
    [effectiveOption, config, row]
  );

  return (
    <div className='w-full'>
      <Combobox<MasterItemOption>
        value={comboboxValue}
        options={optionsWithStoredItem}
        placeholder={config.placeholder}
        className='text-sm !px-2 !py-0'
        getOptionId={(option) => option.hashId}
        getOptionLabel={
          config.getOptionLabel ?? ((option) => option.name || option.code)
        }
        renderOption={renderMasterItemOption}
        renderSelectedValue={renderSelectedValue}
        searchPlaceholder={config.searchPlaceholder}
        filterOptions={scheduleFilterOptions}
        filterValue={scheduleName ?? null}
        filterPlaceholder='Schedule'
        onFilterChange={handleScheduleFilterChange}
        onSearch={setSearchTerm}
        onLoadMore={fetchNextMasterProjectItems}
        hasMore={hasNextMasterProjectItems}
        loading={
          isFetchingNextMasterProjectItems || isLoadingMasterProjectItems
        }
        autoFocus={autoFocus}
        onChange={handleChange}
      />
    </div>
  );
};
