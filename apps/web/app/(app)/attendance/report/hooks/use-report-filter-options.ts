'use client';

import * as React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchUserOptions } from '@/app/(app)/projects/hooks/use-user';
import { UserRoleType } from '@/app/(app)/user/types';
import { fetchProjects } from '@/hooks/useProjects';
import { useWorkers } from './use-workers';

// Fetch all users by role (for project heads, engineers, supervisors)
function useUsersByRole(role: UserRoleType) {
  const query = useInfiniteQuery({
    queryKey: ['users-by-role', role],
    queryFn: async ({ pageParam = 1 }) => {
      // Fetch with empty query to get all users
      const result = await fetchUserOptions(
        '',
        role,
        pageParam as number,
        50,
        undefined
      );
      // Return in a format that can be used with infinite query
      return {
        options: result.options,
        hasNextPage: result.hasNextPage,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasNextPage) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: Infinity,
  });

  // Auto-fetch all pages
  const { hasNextPage, isFetchingNextPage, isLoading, fetchNextPage } = query;
  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  const allOptions = React.useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) => page.options);
  }, [query.data]);

  return {
    options: allOptions,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}

// Fetch all projects
function useAllProjects() {
  const query = useInfiniteQuery({
    queryKey: ['all-projects-for-filter'],
    queryFn: async ({ pageParam = 1, signal }) => {
      return await fetchProjects({
        search: '',
        page: pageParam as number,
        pageSize: 20,
        signal,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      if (lastPage.totalPages > allPages.length) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: Infinity,
  });

  // Auto-fetch all pages
  const { hasNextPage, isFetchingNextPage, isLoading, fetchNextPage } = query;
  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  const allProjects = React.useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) => page.data);
  }, [query.data]);

  const projectOptions = React.useMemo(() => {
    return allProjects.map((project) => ({
      value: project.id,
      label: project.name,
    }));
  }, [allProjects]);

  return {
    options: projectOptions,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}

export function useReportFilterOptions() {
  const projectHeads = useUsersByRole(UserRoleType.ProjectHead);
  const engineers = useUsersByRole(UserRoleType.Engineer);
  const supervisors = useUsersByRole(UserRoleType.Superviser);
  const projects = useAllProjects();
  const workers = useWorkers();

  return {
    projectHeads: {
      options: projectHeads.options,
      isLoading: projectHeads.isLoading,
    },
    engineers: {
      options: engineers.options,
      isLoading: engineers.isLoading,
    },
    supervisors: {
      options: supervisors.options,
      isLoading: supervisors.isLoading,
    },
    projects: {
      options: projects.options,
      isLoading: projects.isLoading,
    },
    workers: {
      options: workers.options,
      isLoading: workers.isLoading,
    },
    isLoading:
      projectHeads.isLoading ||
      engineers.isLoading ||
      supervisors.isLoading ||
      projects.isLoading ||
      workers.isLoading,
  };
}
