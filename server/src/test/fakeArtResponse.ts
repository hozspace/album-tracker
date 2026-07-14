export function fakeArtResponse(
  options: { contentType?: string; status?: number; ok?: boolean; bytes?: Uint8Array } = {},
): Response {
  const bytes = options.bytes ?? new Uint8Array([1, 2, 3, 4])
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    headers: new Headers({ 'content-type': options.contentType ?? 'image/jpeg' }),
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes)
        controller.close()
      },
    }),
  } as unknown as Response
}
