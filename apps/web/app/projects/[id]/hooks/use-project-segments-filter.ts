import React from 'react';
import { ProjectSegment } from '@/types/projects';

const ALL_SEGMENTS_TOGGLE_VALUE = 'all-segments';
const UNASSIGNED_SECTION_ID = 'Not Segmented-section';

export { ALL_SEGMENTS_TOGGLE_VALUE, UNASSIGNED_SECTION_ID };

interface RowWithSegment {
  id: string;
  segmentHashIds?: string[];
  headerKey?: string | null;
}

interface UseProjectSegmentsFilterProps<T extends RowWithSegment> {
  segments: ProjectSegment[];
  data: T[];
  initialSegmentId?: string | null;
}

export function useProjectSegmentsFilter<T extends RowWithSegment>({
  segments,
  data,
  initialSegmentId,
}: UseProjectSegmentsFilterProps<T>) {
  const [selectedSegmentId, setSelectedSegmentId] = React.useState<string>(
    initialSegmentId || ALL_SEGMENTS_TOGGLE_VALUE
  );

  const hasSegments = segments.length > 0;

  // Create stable segment name map for headerKey lookup
  const segmentNameMap = React.useMemo(() => {
    return new Map(
      segments.map((s) => [s.hashId, s.segmentName || 'Untitled'])
    );
  }, [segments]);

  // Filter items based on segmentHashIds array
  const processedData = React.useMemo(() => {
    if (selectedSegmentId === ALL_SEGMENTS_TOGGLE_VALUE) {
      // Show all items when "All segments" tab is selected
      return data.map((item): T => {
        return {
          ...item,
          headerKey: null,
        };
      });
    }

    // Filter items that have the selected segment hashId in their segmentHashIds array
    return data
      .filter((item) => {
        const segmentHashIds = item.segmentHashIds || [];
        // Handle unassigned segment case if needed, though usually handled by ALL or explicit ID
        if (selectedSegmentId === UNASSIGNED_SECTION_ID) {
          return segmentHashIds.length === 0;
        }
        return segmentHashIds.includes(selectedSegmentId);
      })
      .map((item): T => {
        return {
          ...item,
          headerKey: null,
        };
      });
  }, [data, selectedSegmentId]);

  // Validate selected segment still exists
  React.useEffect(() => {
    if (!hasSegments) {
      if (selectedSegmentId !== ALL_SEGMENTS_TOGGLE_VALUE) {
        setSelectedSegmentId(ALL_SEGMENTS_TOGGLE_VALUE);
      }
      return;
    }

    if (
      selectedSegmentId !== ALL_SEGMENTS_TOGGLE_VALUE &&
      selectedSegmentId !== UNASSIGNED_SECTION_ID &&
      !segments.some((seg) => seg.hashId === selectedSegmentId)
    ) {
      setSelectedSegmentId(ALL_SEGMENTS_TOGGLE_VALUE);
    }
  }, [hasSegments, segments, selectedSegmentId]);

  const segmentToggleOptions = React.useMemo(() => {
    if (!hasSegments) {
      return [];
    }

    const allItemsCount = data.length;

    // Count items for each segment based on segmentHashIds array
    const segmentCounts = segments.map((segment) => {
      const count = data.filter((item) => {
        const segmentHashIds = item.segmentHashIds || [];
        return segmentHashIds.includes(segment.hashId);
      }).length;

      return {
        id: segment.hashId,
        label: segment.segmentName || 'Untitled',
        count,
      };
    });

    return [
      {
        id: ALL_SEGMENTS_TOGGLE_VALUE,
        label: 'All segments',
        count: allItemsCount,
      },
      ...segmentCounts,
    ];
  }, [hasSegments, segments, data]);

  const handleSegmentSelectionChange = React.useCallback(
    (value: string) => {
      if (!hasSegments) {
        return;
      }
      setSelectedSegmentId(value || ALL_SEGMENTS_TOGGLE_VALUE);
    },
    [hasSegments]
  );

  return {
    selectedSegmentId,
    processedData,
    segmentToggleOptions,
    handleSegmentSelectionChange,
    segmentNameMap,
  };
}
