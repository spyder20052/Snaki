/** Only retry read requests rejected because the token's issue time is ahead. */
export async function retryJwtRead<T extends { error: { message: string } | null }>(
  request: () => PromiseLike<T>,
  wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
): Promise<T> {
  const delays = [1000, 2000, 4000]
  for (let attempt = 0; ; attempt++) {
    const result = await request()
    if (!result.error?.message.includes('JWT issued at future') || attempt >= delays.length) return result
    await wait(delays[attempt])
  }
}
