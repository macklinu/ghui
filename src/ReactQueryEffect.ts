import * as RQ from '@tanstack/react-query'
import * as Exit from 'effect/Exit'

export const queryOptions = <
  A,
  E,
  TQueryFnData extends Exit.Exit<A, E>,
  TData = TQueryFnData,
  TQueryKey extends RQ.QueryKey = RQ.QueryKey,
>(
  options: RQ.UndefinedInitialDataOptions<TQueryFnData, never, TData, TQueryKey>
) => RQ.queryOptions(options)

interface UseEffectSuspenseQueryOptions<
  A,
  E,
  TQueryFnData extends Exit.Exit<A, E>,
  TData = TQueryFnData,
  TQueryKey extends RQ.QueryKey = readonly unknown[],
> extends RQ.UseSuspenseQueryOptions<TQueryFnData, never, TData, TQueryKey> {}

interface UseQueryOptions<
  TQueryFnData extends Exit.Exit<unknown, unknown> = Exit.Exit<
    unknown,
    unknown
  >,
  TData = TQueryFnData,
  TQueryKey extends RQ.QueryKey = readonly unknown[],
> extends RQ.UseQueryOptions<TQueryFnData, never, TData, TQueryKey> {}

export const useQuery = <
  A,
  E = never,
  TQueryKey extends RQ.QueryKey = readonly unknown[],
>(
  options: UseQueryOptions<Exit.Exit<A, E>, Exit.Exit<A, E>, TQueryKey>
) => {
  const result = RQ.useQuery<
    Exit.Exit<A, E>,
    never,
    Exit.Exit<A, E>,
    TQueryKey
  >(options)

  if (result.isSuccess) {
    if (Exit.isSuccess(result.data)) {
      return {
        ...result,
        data: result.data.value,
      } as const
    } else {
      return {
        ...result,
        isSuccess: false,
        isError: true,
        status: 'error',
        data: undefined,
        error: result.data.cause,
      } as const
    }
  }

  return result
}

export const useSuspenseQuery = <
  A,
  E = never,
  TQueryKey extends RQ.QueryKey = readonly unknown[],
>(
  options: UseEffectSuspenseQueryOptions<
    A,
    E,
    Exit.Exit<A, E>,
    Exit.Exit<A, E>,
    TQueryKey
  >
) => {
  const result = RQ.useSuspenseQuery<
    Exit.Exit<A, E>,
    never,
    Exit.Exit<A, E>,
    TQueryKey
  >(options)

  return result
}

export interface UseEffectMutationOptions<
  A,
  E,
  TVariables = void,
  TOnMutateResult = unknown,
> extends Omit<
    RQ.UseMutationOptions<
      Exit.Exit<A, E>,
      Exit.Failure<A, E>,
      TVariables,
      TOnMutateResult
    >,
    'mutationFn' | 'onSuccess' | 'onError'
  > {
  mutationFn: (variables: TVariables) => Promise<Exit.Exit<A, E>>
  onSuccess?: (
    data: A,
    variables: TVariables,
    onMutateResult: TOnMutateResult,
    context: RQ.MutationFunctionContext
  ) => Promise<unknown> | unknown
  onError?: (
    error: Exit.Failure<A, E>,
    variables: TVariables,
    onMutateResult: TOnMutateResult | undefined,
    context: RQ.MutationFunctionContext
  ) => Promise<unknown> | unknown
}

export const useMutation = <A, E, TVariables = void, TOnMutateResult = unknown>(
  options: UseEffectMutationOptions<A, E, TVariables, TOnMutateResult>
): RQ.UseMutationResult<A, Exit.Failure<A, E>, TVariables, TOnMutateResult> => {
  const { mutationFn, onSuccess, ...restOptions } = options

  const wrappedMutationFn = async (
    variables: TVariables
  ): Promise<Exit.Exit<A, E>> => {
    const exit = await mutationFn(variables)
    if (Exit.isFailure(exit)) {
      // Throw the failure so react-query treats it as an error
      throw exit
    }
    return exit
  }

  const result = RQ.useMutation<
    Exit.Exit<A, E>,
    Exit.Failure<A, E>,
    TVariables,
    TOnMutateResult
  >({
    ...restOptions,
    mutationFn: wrappedMutationFn,
    onSuccess(data, variables, onMutateResult, context) {
      if (Exit.isSuccess(data)) {
        onSuccess?.(data.value, variables, onMutateResult, context)
      }
    },
  })

  if (result.isSuccess && result.data) {
    if (Exit.isSuccess(result.data)) {
      return {
        ...result,
        data: result.data.value,
      } as RQ.UseMutationResult<
        A,
        Exit.Failure<A, E>,
        TVariables,
        TOnMutateResult
      >
    }
  }

  return result as RQ.UseMutationResult<
    A,
    Exit.Failure<A, E>,
    TVariables,
    TOnMutateResult
  >
}
