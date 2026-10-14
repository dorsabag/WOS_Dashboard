import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { DashboardSummary, ErrorEnvelope, GetItemsParams, GetLeaderboardParams, GetOwnerAccess200, Goal, GoalInput, GoalItem, GoalItemInput, GoalItemUpdate, GoalUpdate, HealthStatus, Item, ItemCategory, ItemInput, ItemUpdate, LeaderboardError, LeaderboardResponse, March, MarchInput, MarchesRemaining, Note, NoteImage, NoteImageInput, NoteInput, ProfileExport, ProfileExportFieldUpdate, ProfileImportConfirmation, ProfileImportPreview, ProfileImportRequest, Troops, TroopsInput, TroopsSummary, UploadUrlRequest, UploadUrlResponse } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getGetOwnerAccessUrl: () => string;
/**
 * @summary Confirm the authenticated account is the dashboard owner
 */
export declare const getOwnerAccess: (options?: RequestInit) => Promise<GetOwnerAccess200>;
export declare const getGetOwnerAccessQueryKey: () => readonly ["/api/auth/access"];
export declare const getGetOwnerAccessQueryOptions: <TData = Awaited<ReturnType<typeof getOwnerAccess>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOwnerAccess>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getOwnerAccess>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetOwnerAccessQueryResult = NonNullable<Awaited<ReturnType<typeof getOwnerAccess>>>;
export type GetOwnerAccessQueryError = ErrorType<void>;
/**
 * @summary Confirm the authenticated account is the dashboard owner
 */
export declare function useGetOwnerAccess<TData = Awaited<ReturnType<typeof getOwnerAccess>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOwnerAccess>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetTroopsUrl: () => string;
/**
 * @summary Get troop data
 */
export declare const getTroops: (options?: RequestInit) => Promise<Troops>;
export declare const getGetTroopsQueryKey: () => readonly ["/api/troops"];
export declare const getGetTroopsQueryOptions: <TData = Awaited<ReturnType<typeof getTroops>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTroops>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTroops>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTroopsQueryResult = NonNullable<Awaited<ReturnType<typeof getTroops>>>;
export type GetTroopsQueryError = ErrorType<unknown>;
/**
 * @summary Get troop data
 */
export declare function useGetTroops<TData = Awaited<ReturnType<typeof getTroops>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTroops>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateTroopsUrl: () => string;
/**
 * @summary Update troop data
 */
export declare const updateTroops: (troopsInput: TroopsInput, options?: RequestInit) => Promise<Troops>;
export declare const getUpdateTroopsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTroops>>, TError, {
        data: BodyType<TroopsInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTroops>>, TError, {
    data: BodyType<TroopsInput>;
}, TContext>;
export type UpdateTroopsMutationResult = NonNullable<Awaited<ReturnType<typeof updateTroops>>>;
export type UpdateTroopsMutationBody = BodyType<TroopsInput>;
export type UpdateTroopsMutationError = ErrorType<unknown>;
/**
* @summary Update troop data
*/
export declare const useUpdateTroops: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTroops>>, TError, {
        data: BodyType<TroopsInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTroops>>, TError, {
    data: BodyType<TroopsInput>;
}, TContext>;
export declare const getGetTroopsSummaryUrl: () => string;
/**
 * @summary Get troop deployment and rally summary
 */
export declare const getTroopsSummary: (options?: RequestInit) => Promise<TroopsSummary>;
export declare const getGetTroopsSummaryQueryKey: () => readonly ["/api/troops/summary"];
export declare const getGetTroopsSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getTroopsSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTroopsSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTroopsSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTroopsSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getTroopsSummary>>>;
export type GetTroopsSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get troop deployment and rally summary
 */
export declare function useGetTroopsSummary<TData = Awaited<ReturnType<typeof getTroopsSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTroopsSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMarchesUrl: () => string;
/**
 * @summary Get all 6 bear trap marches
 */
export declare const getMarches: (options?: RequestInit) => Promise<March[]>;
export declare const getGetMarchesQueryKey: () => readonly ["/api/marches"];
export declare const getGetMarchesQueryOptions: <TData = Awaited<ReturnType<typeof getMarches>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMarches>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMarches>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMarchesQueryResult = NonNullable<Awaited<ReturnType<typeof getMarches>>>;
export type GetMarchesQueryError = ErrorType<unknown>;
/**
 * @summary Get all 6 bear trap marches
 */
export declare function useGetMarches<TData = Awaited<ReturnType<typeof getMarches>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMarches>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateMarchUrl: (id: number) => string;
/**
 * @summary Update a march configuration
 */
export declare const updateMarch: (id: number, marchInput: MarchInput, options?: RequestInit) => Promise<March>;
export declare const getUpdateMarchMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMarch>>, TError, {
        id: number;
        data: BodyType<MarchInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateMarch>>, TError, {
    id: number;
    data: BodyType<MarchInput>;
}, TContext>;
export type UpdateMarchMutationResult = NonNullable<Awaited<ReturnType<typeof updateMarch>>>;
export type UpdateMarchMutationBody = BodyType<MarchInput>;
export type UpdateMarchMutationError = ErrorType<void>;
/**
* @summary Update a march configuration
*/
export declare const useUpdateMarch: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMarch>>, TError, {
        id: number;
        data: BodyType<MarchInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateMarch>>, TError, {
    id: number;
    data: BodyType<MarchInput>;
}, TContext>;
export declare const getGetMarchesRemainingUrl: () => string;
/**
 * @summary Get remaining troops after all marches
 */
export declare const getMarchesRemaining: (options?: RequestInit) => Promise<MarchesRemaining>;
export declare const getGetMarchesRemainingQueryKey: () => readonly ["/api/marches/remaining"];
export declare const getGetMarchesRemainingQueryOptions: <TData = Awaited<ReturnType<typeof getMarchesRemaining>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMarchesRemaining>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMarchesRemaining>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMarchesRemainingQueryResult = NonNullable<Awaited<ReturnType<typeof getMarchesRemaining>>>;
export type GetMarchesRemainingQueryError = ErrorType<unknown>;
/**
 * @summary Get remaining troops after all marches
 */
export declare function useGetMarchesRemaining<TData = Awaited<ReturnType<typeof getMarchesRemaining>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMarchesRemaining>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetItemsUrl: (params?: GetItemsParams) => string;
/**
 * @summary Get all items grouped by category
 */
export declare const getItems: (params?: GetItemsParams, options?: RequestInit) => Promise<Item[]>;
export declare const getGetItemsQueryKey: (params?: GetItemsParams) => readonly ["/api/items", ...GetItemsParams[]];
export declare const getGetItemsQueryOptions: <TData = Awaited<ReturnType<typeof getItems>>, TError = ErrorType<unknown>>(params?: GetItemsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getItems>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getItems>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetItemsQueryResult = NonNullable<Awaited<ReturnType<typeof getItems>>>;
export type GetItemsQueryError = ErrorType<unknown>;
/**
 * @summary Get all items grouped by category
 */
export declare function useGetItems<TData = Awaited<ReturnType<typeof getItems>>, TError = ErrorType<unknown>>(params?: GetItemsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getItems>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateItemUrl: () => string;
/**
 * @summary Create a new item
 */
export declare const createItem: (itemInput: ItemInput, options?: RequestInit) => Promise<Item>;
export declare const getCreateItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createItem>>, TError, {
        data: BodyType<ItemInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createItem>>, TError, {
    data: BodyType<ItemInput>;
}, TContext>;
export type CreateItemMutationResult = NonNullable<Awaited<ReturnType<typeof createItem>>>;
export type CreateItemMutationBody = BodyType<ItemInput>;
export type CreateItemMutationError = ErrorType<unknown>;
/**
* @summary Create a new item
*/
export declare const useCreateItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createItem>>, TError, {
        data: BodyType<ItemInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createItem>>, TError, {
    data: BodyType<ItemInput>;
}, TContext>;
export declare const getUpdateItemUrl: (id: number) => string;
/**
 * @summary Update an item
 */
export declare const updateItem: (id: number, itemUpdate: ItemUpdate, options?: RequestInit) => Promise<Item>;
export declare const getUpdateItemMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateItem>>, TError, {
        id: number;
        data: BodyType<ItemUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateItem>>, TError, {
    id: number;
    data: BodyType<ItemUpdate>;
}, TContext>;
export type UpdateItemMutationResult = NonNullable<Awaited<ReturnType<typeof updateItem>>>;
export type UpdateItemMutationBody = BodyType<ItemUpdate>;
export type UpdateItemMutationError = ErrorType<void>;
/**
* @summary Update an item
*/
export declare const useUpdateItem: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateItem>>, TError, {
        id: number;
        data: BodyType<ItemUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateItem>>, TError, {
    id: number;
    data: BodyType<ItemUpdate>;
}, TContext>;
export declare const getDeleteItemUrl: (id: number) => string;
/**
 * @summary Delete an item
 */
export declare const deleteItem: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteItem>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteItem>>, TError, {
    id: number;
}, TContext>;
export type DeleteItemMutationResult = NonNullable<Awaited<ReturnType<typeof deleteItem>>>;
export type DeleteItemMutationError = ErrorType<unknown>;
/**
* @summary Delete an item
*/
export declare const useDeleteItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteItem>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteItem>>, TError, {
    id: number;
}, TContext>;
export declare const getGetItemCategoriesUrl: () => string;
/**
 * @summary Get all item categories
 */
export declare const getItemCategories: (options?: RequestInit) => Promise<ItemCategory[]>;
export declare const getGetItemCategoriesQueryKey: () => readonly ["/api/items/categories"];
export declare const getGetItemCategoriesQueryOptions: <TData = Awaited<ReturnType<typeof getItemCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getItemCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getItemCategories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetItemCategoriesQueryResult = NonNullable<Awaited<ReturnType<typeof getItemCategories>>>;
export type GetItemCategoriesQueryError = ErrorType<unknown>;
/**
 * @summary Get all item categories
 */
export declare function useGetItemCategories<TData = Awaited<ReturnType<typeof getItemCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getItemCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetGoalsUrl: () => string;
/**
 * @summary Get all goals
 */
export declare const getGoals: (options?: RequestInit) => Promise<Goal[]>;
export declare const getGetGoalsQueryKey: () => readonly ["/api/goals"];
export declare const getGetGoalsQueryOptions: <TData = Awaited<ReturnType<typeof getGoals>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGoals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getGoals>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetGoalsQueryResult = NonNullable<Awaited<ReturnType<typeof getGoals>>>;
export type GetGoalsQueryError = ErrorType<unknown>;
/**
 * @summary Get all goals
 */
export declare function useGetGoals<TData = Awaited<ReturnType<typeof getGoals>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGoals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateGoalUrl: () => string;
/**
 * @summary Create a new goal
 */
export declare const createGoal: (goalInput: GoalInput, options?: RequestInit) => Promise<Goal>;
export declare const getCreateGoalMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGoal>>, TError, {
        data: BodyType<GoalInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createGoal>>, TError, {
    data: BodyType<GoalInput>;
}, TContext>;
export type CreateGoalMutationResult = NonNullable<Awaited<ReturnType<typeof createGoal>>>;
export type CreateGoalMutationBody = BodyType<GoalInput>;
export type CreateGoalMutationError = ErrorType<unknown>;
/**
* @summary Create a new goal
*/
export declare const useCreateGoal: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGoal>>, TError, {
        data: BodyType<GoalInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createGoal>>, TError, {
    data: BodyType<GoalInput>;
}, TContext>;
export declare const getUpdateGoalUrl: (id: number) => string;
/**
 * @summary Update a goal
 */
export declare const updateGoal: (id: number, goalUpdate: GoalUpdate, options?: RequestInit) => Promise<Goal>;
export declare const getUpdateGoalMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateGoal>>, TError, {
        id: number;
        data: BodyType<GoalUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateGoal>>, TError, {
    id: number;
    data: BodyType<GoalUpdate>;
}, TContext>;
export type UpdateGoalMutationResult = NonNullable<Awaited<ReturnType<typeof updateGoal>>>;
export type UpdateGoalMutationBody = BodyType<GoalUpdate>;
export type UpdateGoalMutationError = ErrorType<void>;
/**
* @summary Update a goal
*/
export declare const useUpdateGoal: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateGoal>>, TError, {
        id: number;
        data: BodyType<GoalUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateGoal>>, TError, {
    id: number;
    data: BodyType<GoalUpdate>;
}, TContext>;
export declare const getDeleteGoalUrl: (id: number) => string;
/**
 * @summary Delete a goal
 */
export declare const deleteGoal: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteGoalMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteGoal>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteGoal>>, TError, {
    id: number;
}, TContext>;
export type DeleteGoalMutationResult = NonNullable<Awaited<ReturnType<typeof deleteGoal>>>;
export type DeleteGoalMutationError = ErrorType<unknown>;
/**
* @summary Delete a goal
*/
export declare const useDeleteGoal: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteGoal>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteGoal>>, TError, {
    id: number;
}, TContext>;
export declare const getCompleteGoalUrl: (id: number) => string;
/**
 * @summary Mark a goal as complete and deduct required items from inventory
 */
export declare const completeGoal: (id: number, options?: RequestInit) => Promise<Goal>;
export declare const getCompleteGoalMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeGoal>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof completeGoal>>, TError, {
    id: number;
}, TContext>;
export type CompleteGoalMutationResult = NonNullable<Awaited<ReturnType<typeof completeGoal>>>;
export type CompleteGoalMutationError = ErrorType<void>;
/**
* @summary Mark a goal as complete and deduct required items from inventory
*/
export declare const useCompleteGoal: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeGoal>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof completeGoal>>, TError, {
    id: number;
}, TContext>;
export declare const getUncompleteGoalUrl: (id: number) => string;
/**
 * @summary Mark a goal as not complete and restore inventory amounts
 */
export declare const uncompleteGoal: (id: number, options?: RequestInit) => Promise<Goal>;
export declare const getUncompleteGoalMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof uncompleteGoal>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof uncompleteGoal>>, TError, {
    id: number;
}, TContext>;
export type UncompleteGoalMutationResult = NonNullable<Awaited<ReturnType<typeof uncompleteGoal>>>;
export type UncompleteGoalMutationError = ErrorType<void>;
/**
* @summary Mark a goal as not complete and restore inventory amounts
*/
export declare const useUncompleteGoal: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof uncompleteGoal>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof uncompleteGoal>>, TError, {
    id: number;
}, TContext>;
export declare const getCreateGoalItemUrl: () => string;
/**
 * @summary Add an item requirement to a goal
 */
export declare const createGoalItem: (goalItemInput: GoalItemInput, options?: RequestInit) => Promise<GoalItem>;
export declare const getCreateGoalItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGoalItem>>, TError, {
        data: BodyType<GoalItemInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createGoalItem>>, TError, {
    data: BodyType<GoalItemInput>;
}, TContext>;
export type CreateGoalItemMutationResult = NonNullable<Awaited<ReturnType<typeof createGoalItem>>>;
export type CreateGoalItemMutationBody = BodyType<GoalItemInput>;
export type CreateGoalItemMutationError = ErrorType<unknown>;
/**
* @summary Add an item requirement to a goal
*/
export declare const useCreateGoalItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGoalItem>>, TError, {
        data: BodyType<GoalItemInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createGoalItem>>, TError, {
    data: BodyType<GoalItemInput>;
}, TContext>;
export declare const getUpdateGoalItemUrl: (id: number) => string;
/**
 * @summary Update a goal item requirement
 */
export declare const updateGoalItem: (id: number, goalItemUpdate: GoalItemUpdate, options?: RequestInit) => Promise<GoalItem>;
export declare const getUpdateGoalItemMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateGoalItem>>, TError, {
        id: number;
        data: BodyType<GoalItemUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateGoalItem>>, TError, {
    id: number;
    data: BodyType<GoalItemUpdate>;
}, TContext>;
export type UpdateGoalItemMutationResult = NonNullable<Awaited<ReturnType<typeof updateGoalItem>>>;
export type UpdateGoalItemMutationBody = BodyType<GoalItemUpdate>;
export type UpdateGoalItemMutationError = ErrorType<void>;
/**
* @summary Update a goal item requirement
*/
export declare const useUpdateGoalItem: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateGoalItem>>, TError, {
        id: number;
        data: BodyType<GoalItemUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateGoalItem>>, TError, {
    id: number;
    data: BodyType<GoalItemUpdate>;
}, TContext>;
export declare const getDeleteGoalItemUrl: (id: number) => string;
/**
 * @summary Remove an item requirement from a goal
 */
export declare const deleteGoalItem: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteGoalItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteGoalItem>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteGoalItem>>, TError, {
    id: number;
}, TContext>;
export type DeleteGoalItemMutationResult = NonNullable<Awaited<ReturnType<typeof deleteGoalItem>>>;
export type DeleteGoalItemMutationError = ErrorType<unknown>;
/**
* @summary Remove an item requirement from a goal
*/
export declare const useDeleteGoalItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteGoalItem>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteGoalItem>>, TError, {
    id: number;
}, TContext>;
export declare const getRequestUploadUrlUrl: () => string;
/**
 * @summary Request a presigned URL for file upload
 */
export declare const requestUploadUrl: (uploadUrlRequest: UploadUrlRequest, options?: RequestInit) => Promise<UploadUrlResponse>;
export declare const getRequestUploadUrlMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
        data: BodyType<UploadUrlRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
    data: BodyType<UploadUrlRequest>;
}, TContext>;
export type RequestUploadUrlMutationResult = NonNullable<Awaited<ReturnType<typeof requestUploadUrl>>>;
export type RequestUploadUrlMutationBody = BodyType<UploadUrlRequest>;
export type RequestUploadUrlMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Request a presigned URL for file upload
*/
export declare const useRequestUploadUrl: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
        data: BodyType<UploadUrlRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
    data: BodyType<UploadUrlRequest>;
}, TContext>;
export declare const getGetStorageObjectUrl: (objectPath: string) => string;
/**
 * @summary Serve an object entity from PRIVATE_OBJECT_DIR
 */
export declare const getStorageObject: (objectPath: string, options?: RequestInit) => Promise<Blob>;
export declare const getGetStorageObjectQueryKey: (objectPath: string) => readonly [`/api/storage/objects/${string}`];
export declare const getGetStorageObjectQueryOptions: <TData = Awaited<ReturnType<typeof getStorageObject>>, TError = ErrorType<ErrorEnvelope>>(objectPath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStorageObject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStorageObject>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStorageObjectQueryResult = NonNullable<Awaited<ReturnType<typeof getStorageObject>>>;
export type GetStorageObjectQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary Serve an object entity from PRIVATE_OBJECT_DIR
 */
export declare function useGetStorageObject<TData = Awaited<ReturnType<typeof getStorageObject>>, TError = ErrorType<ErrorEnvelope>>(objectPath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStorageObject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetNotesUrl: () => string;
/**
 * @summary Get the notes content
 */
export declare const getNotes: (options?: RequestInit) => Promise<Note>;
export declare const getGetNotesQueryKey: () => readonly ["/api/notes"];
export declare const getGetNotesQueryOptions: <TData = Awaited<ReturnType<typeof getNotes>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNotes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getNotes>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetNotesQueryResult = NonNullable<Awaited<ReturnType<typeof getNotes>>>;
export type GetNotesQueryError = ErrorType<unknown>;
/**
 * @summary Get the notes content
 */
export declare function useGetNotes<TData = Awaited<ReturnType<typeof getNotes>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNotes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateNotesUrl: () => string;
/**
 * @summary Update the notes content
 */
export declare const updateNotes: (noteInput: NoteInput, options?: RequestInit) => Promise<Note>;
export declare const getUpdateNotesMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateNotes>>, TError, {
        data: BodyType<NoteInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateNotes>>, TError, {
    data: BodyType<NoteInput>;
}, TContext>;
export type UpdateNotesMutationResult = NonNullable<Awaited<ReturnType<typeof updateNotes>>>;
export type UpdateNotesMutationBody = BodyType<NoteInput>;
export type UpdateNotesMutationError = ErrorType<unknown>;
/**
* @summary Update the notes content
*/
export declare const useUpdateNotes: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateNotes>>, TError, {
        data: BodyType<NoteInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateNotes>>, TError, {
    data: BodyType<NoteInput>;
}, TContext>;
export declare const getGetNoteImagesUrl: () => string;
/**
 * @summary Get saved Notes gallery images
 */
export declare const getNoteImages: (options?: RequestInit) => Promise<NoteImage[]>;
export declare const getGetNoteImagesQueryKey: () => readonly ["/api/notes/images"];
export declare const getGetNoteImagesQueryOptions: <TData = Awaited<ReturnType<typeof getNoteImages>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNoteImages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getNoteImages>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetNoteImagesQueryResult = NonNullable<Awaited<ReturnType<typeof getNoteImages>>>;
export type GetNoteImagesQueryError = ErrorType<unknown>;
/**
 * @summary Get saved Notes gallery images
 */
export declare function useGetNoteImages<TData = Awaited<ReturnType<typeof getNoteImages>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNoteImages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getRegisterNoteImageUrl: () => string;
/**
 * @summary Register an uploaded Notes gallery image
 */
export declare const registerNoteImage: (noteImageInput: NoteImageInput, options?: RequestInit) => Promise<NoteImage>;
export declare const getRegisterNoteImageMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof registerNoteImage>>, TError, {
        data: BodyType<NoteImageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof registerNoteImage>>, TError, {
    data: BodyType<NoteImageInput>;
}, TContext>;
export type RegisterNoteImageMutationResult = NonNullable<Awaited<ReturnType<typeof registerNoteImage>>>;
export type RegisterNoteImageMutationBody = BodyType<NoteImageInput>;
export type RegisterNoteImageMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Register an uploaded Notes gallery image
*/
export declare const useRegisterNoteImage: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof registerNoteImage>>, TError, {
        data: BodyType<NoteImageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof registerNoteImage>>, TError, {
    data: BodyType<NoteImageInput>;
}, TContext>;
export declare const getDeleteNoteImageUrl: (id: number) => string;
/**
 * @summary Delete a Notes gallery image (DB record + storage object)
 */
export declare const deleteNoteImage: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteNoteImageMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteNoteImage>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteNoteImage>>, TError, {
    id: number;
}, TContext>;
export type DeleteNoteImageMutationResult = NonNullable<Awaited<ReturnType<typeof deleteNoteImage>>>;
export type DeleteNoteImageMutationError = ErrorType<ErrorEnvelope>;
/**
* @summary Delete a Notes gallery image (DB record + storage object)
*/
export declare const useDeleteNoteImage: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteNoteImage>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteNoteImage>>, TError, {
    id: number;
}, TContext>;
export declare const getGetProfileExportUrl: () => string;
/**
 * @summary Get the complete imported profile export
 */
export declare const getProfileExport: (options?: RequestInit) => Promise<ProfileExport>;
export declare const getGetProfileExportQueryKey: () => readonly ["/api/profile/export"];
export declare const getGetProfileExportQueryOptions: <TData = Awaited<ReturnType<typeof getProfileExport>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProfileExport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProfileExport>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProfileExportQueryResult = NonNullable<Awaited<ReturnType<typeof getProfileExport>>>;
export type GetProfileExportQueryError = ErrorType<unknown>;
/**
 * @summary Get the complete imported profile export
 */
export declare function useGetProfileExport<TData = Awaited<ReturnType<typeof getProfileExport>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProfileExport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getPreviewProfileImportUrl: () => string;
/**
 * @summary Validate and preview a WOS Tools profile CSV without saving it
 */
export declare const previewProfileImport: (profileImportRequest: ProfileImportRequest, options?: RequestInit) => Promise<ProfileImportPreview>;
export declare const getPreviewProfileImportMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof previewProfileImport>>, TError, {
        data: BodyType<ProfileImportRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof previewProfileImport>>, TError, {
    data: BodyType<ProfileImportRequest>;
}, TContext>;
export type PreviewProfileImportMutationResult = NonNullable<Awaited<ReturnType<typeof previewProfileImport>>>;
export type PreviewProfileImportMutationBody = BodyType<ProfileImportRequest>;
export type PreviewProfileImportMutationError = ErrorType<void>;
/**
* @summary Validate and preview a WOS Tools profile CSV without saving it
*/
export declare const usePreviewProfileImport: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof previewProfileImport>>, TError, {
        data: BodyType<ProfileImportRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof previewProfileImport>>, TError, {
    data: BodyType<ProfileImportRequest>;
}, TContext>;
export declare const getImportProfileExportUrl: () => string;
/**
 * @summary Replace the saved profile export with a validated WOS Tools CSV
 */
export declare const importProfileExport: (profileImportConfirmation: ProfileImportConfirmation, options?: RequestInit) => Promise<ProfileExport>;
export declare const getImportProfileExportMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof importProfileExport>>, TError, {
        data: BodyType<ProfileImportConfirmation>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof importProfileExport>>, TError, {
    data: BodyType<ProfileImportConfirmation>;
}, TContext>;
export type ImportProfileExportMutationResult = NonNullable<Awaited<ReturnType<typeof importProfileExport>>>;
export type ImportProfileExportMutationBody = BodyType<ProfileImportConfirmation>;
export type ImportProfileExportMutationError = ErrorType<void>;
/**
* @summary Replace the saved profile export with a validated WOS Tools CSV
*/
export declare const useImportProfileExport: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof importProfileExport>>, TError, {
        data: BodyType<ProfileImportConfirmation>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof importProfileExport>>, TError, {
    data: BodyType<ProfileImportConfirmation>;
}, TContext>;
export declare const getUpdateProfileExportFieldUrl: () => string;
/**
 * @summary Update one value in the imported profile export
 */
export declare const updateProfileExportField: (profileExportFieldUpdate: ProfileExportFieldUpdate, options?: RequestInit) => Promise<ProfileExport>;
export declare const getUpdateProfileExportFieldMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProfileExportField>>, TError, {
        data: BodyType<ProfileExportFieldUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProfileExportField>>, TError, {
    data: BodyType<ProfileExportFieldUpdate>;
}, TContext>;
export type UpdateProfileExportFieldMutationResult = NonNullable<Awaited<ReturnType<typeof updateProfileExportField>>>;
export type UpdateProfileExportFieldMutationBody = BodyType<ProfileExportFieldUpdate>;
export type UpdateProfileExportFieldMutationError = ErrorType<void>;
/**
* @summary Update one value in the imported profile export
*/
export declare const useUpdateProfileExportField: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProfileExportField>>, TError, {
        data: BodyType<ProfileExportFieldUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProfileExportField>>, TError, {
    data: BodyType<ProfileExportFieldUpdate>;
}, TContext>;
export declare const getGetDashboardSummaryUrl: () => string;
/**
 * @summary Get a dashboard overview with totals and progress
 */
export declare const getDashboardSummary: (options?: RequestInit) => Promise<DashboardSummary>;
export declare const getGetDashboardSummaryQueryKey: () => readonly ["/api/dashboard/summary"];
export declare const getGetDashboardSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardSummary>>>;
export type GetDashboardSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get a dashboard overview with totals and progress
 */
export declare function useGetDashboardSummary<TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetLeaderboardUrl: (params?: GetLeaderboardParams) => string;
/**
 * @summary Live WoS Atlas power leaderboard (proxied)
 */
export declare const getLeaderboard: (params?: GetLeaderboardParams, options?: RequestInit) => Promise<LeaderboardResponse>;
export declare const getGetLeaderboardQueryKey: (params?: GetLeaderboardParams) => readonly ["/api/leaderboard", ...GetLeaderboardParams[]];
export declare const getGetLeaderboardQueryOptions: <TData = Awaited<ReturnType<typeof getLeaderboard>>, TError = ErrorType<LeaderboardError>>(params?: GetLeaderboardParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLeaderboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLeaderboard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLeaderboardQueryResult = NonNullable<Awaited<ReturnType<typeof getLeaderboard>>>;
export type GetLeaderboardQueryError = ErrorType<LeaderboardError>;
/**
 * @summary Live WoS Atlas power leaderboard (proxied)
 */
export declare function useGetLeaderboard<TData = Awaited<ReturnType<typeof getLeaderboard>>, TError = ErrorType<LeaderboardError>>(params?: GetLeaderboardParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLeaderboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map