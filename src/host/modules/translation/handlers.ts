import { TRANSLATION_ENDPOINTS } from '../../../shared/contracts/translation.ts'
import type { RpcHandler } from '../../types.ts'
import type { createTranslationService } from './service.ts'

export function createTranslationHandlers(
  service: ReturnType<typeof createTranslationService>,
): Record<string, RpcHandler> {
  return {
    [TRANSLATION_ENDPOINTS.translationProviders]: () => service.translationProviders(),
    [TRANSLATION_ENDPOINTS.translate]: payload => service.translate(payload),
    [TRANSLATION_ENDPOINTS.translateBatch]: payload => service.translateBatch(payload),
    [TRANSLATION_ENDPOINTS.translationCacheClear]: () => service.translationCacheClear(),
  }
}
