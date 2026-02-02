import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  SnapRaidStatus,
  ParsedSnapRaidConfig,
  Schedule,
  LogFile,
  DiffReport,
  NotificationSettings,
  SyncSafetySettings,
  AdvancedSettings,
  AppConfig,
  ApiResponse,
  FileSystemResponse,
} from "@shared/types";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: [
    "Status",
    "Config",
    "Schedules",
    "Logs",
    "Notifications",
    "SyncSafety",
    "Advanced",
  ],
  endpoints: (builder) => ({
    // Status
    getStatus: builder.query<SnapRaidStatus, void>({
      query: () => "/status",
      providesTags: ["Status"],
    }),

    // Config
    getConfig: builder.query<ParsedSnapRaidConfig, void>({
      query: () => "/config",
      providesTags: ["Config"],
    }),
    getRawConfig: builder.query<string, void>({
      query: () => "/config/raw",
      providesTags: ["Config"],
    }),
    updateConfig: builder.mutation<ApiResponse, ParsedSnapRaidConfig>({
      query: (config) => ({
        url: "/config",
        method: "PUT",
        body: config,
      }),
      invalidatesTags: ["Config", "Status"],
    }),
    updateRawConfig: builder.mutation<ApiResponse, string>({
      query: (content) => ({
        url: "/config/raw",
        method: "PUT",
        body: { content },
      }),
      invalidatesTags: ["Config", "Status"],
    }),

    // Commands
    executeCommand: builder.mutation<
      ApiResponse,
      { command: string; args?: string[] }
    >({
      query: ({ command, args }) => ({
        url: `/command/${command}`,
        method: "POST",
        body: { args },
      }),
      invalidatesTags: ["Status"],
    }),
    abortCommand: builder.mutation<ApiResponse, void>({
      query: () => ({
        url: "/command/abort",
        method: "POST",
      }),
    }),
    getDiff: builder.query<DiffReport, void>({
      query: () => "/diff",
    }),

    // Schedules
    getSchedules: builder.query<Schedule[], void>({
      query: () => "/schedules",
      providesTags: ["Schedules"],
    }),
    createSchedule: builder.mutation<
      Schedule,
      Omit<Schedule, "id" | "createdAt" | "updatedAt">
    >({
      query: (schedule) => ({
        url: "/schedules",
        method: "POST",
        body: schedule,
      }),
      invalidatesTags: ["Schedules"],
    }),
    updateSchedule: builder.mutation<
      Schedule,
      { id: string; updates: Partial<Schedule> }
    >({
      query: ({ id, updates }) => ({
        url: `/schedules/${id}`,
        method: "PUT",
        body: updates,
      }),
      invalidatesTags: ["Schedules"],
    }),
    deleteSchedule: builder.mutation<ApiResponse, string>({
      query: (id) => ({
        url: `/schedules/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Schedules"],
    }),

    // Logs
    getLogs: builder.query<LogFile[], void>({
      query: () => "/logs",
      providesTags: ["Logs"],
    }),
    getLogContent: builder.query<string, string>({
      query: (filename) => `/logs/${filename}`,
    }),
    deleteAllLogs: builder.mutation<
      { success: boolean; deleted: number },
      void
    >({
      query: () => ({
        url: "/logs?all=1",
        method: "DELETE",
      }),
      invalidatesTags: ["Logs"],
    }),
    deleteLogsOlderThan: builder.mutation<
      { success: boolean; deleted: number },
      number
    >({
      query: (days) => ({
        url: `/logs?olderThan=${days}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Logs"],
    }),

    // Notifications
    getNotificationSettings: builder.query<NotificationSettings, void>({
      query: () => "/notifications/settings",
      providesTags: ["Notifications"],
    }),
    updateNotificationSettings: builder.mutation<
      ApiResponse,
      NotificationSettings
    >({
      query: (settings) => ({
        url: "/notifications/settings",
        method: "PUT",
        body: settings,
      }),
      invalidatesTags: ["Notifications"],
    }),
    testNotification: builder.mutation<ApiResponse, { channel: string }>({
      query: ({ channel }) => ({
        url: "/notifications/test",
        method: "POST",
        body: { channel },
      }),
    }),

    // Sync Safety
    getSyncSafetySettings: builder.query<SyncSafetySettings, void>({
      query: () => "/sync-safety/settings",
      providesTags: ["SyncSafety"],
    }),
    updateSyncSafetySettings: builder.mutation<ApiResponse, SyncSafetySettings>(
      {
        query: (settings) => ({
          url: "/sync-safety/settings",
          method: "PUT",
          body: settings,
        }),
        invalidatesTags: ["SyncSafety"],
      },
    ),

    // Advanced Settings
    getAdvancedSettings: builder.query<AdvancedSettings, void>({
      query: () => "/advanced/settings",
      providesTags: ["Advanced"],
    }),
    updateAdvancedSettings: builder.mutation<ApiResponse, AdvancedSettings>({
      query: (settings) => ({
        url: "/advanced/settings",
        method: "PUT",
        body: settings,
      }),
      invalidatesTags: ["Advanced"],
    }),

    // App Config
    getAppConfig: builder.query<AppConfig, void>({
      query: () => "/app-config",
    }),

    // File system
    getFileSystemEntries: builder.query<FileSystemResponse, { path?: string }>({
      query: ({ path }) => ({
        url: "/fs",
        params: path ? { path } : undefined,
      }),
    }),
  }),
});

export const {
  useGetStatusQuery,
  useGetConfigQuery,
  useGetRawConfigQuery,
  useUpdateConfigMutation,
  useUpdateRawConfigMutation,
  useExecuteCommandMutation,
  useAbortCommandMutation,
  useGetDiffQuery,
  useGetSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
  useGetLogsQuery,
  useGetLogContentQuery,
  useDeleteAllLogsMutation,
  useDeleteLogsOlderThanMutation,
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  useTestNotificationMutation,
  useGetSyncSafetySettingsQuery,
  useUpdateSyncSafetySettingsMutation,
  useGetAdvancedSettingsQuery,
  useUpdateAdvancedSettingsMutation,
  useGetAppConfigQuery,
  useGetFileSystemEntriesQuery,
} = api;
