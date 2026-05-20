import { useEffect, useState } from 'react';

import type { AppApi } from '@/shared/ipc/app-api';

export default function usePendingGoogleAuthorizationUrl(input: {
  isPending: boolean;
  api: AppApi | null;
}): string | null {
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!input.isPending || !input.api) {
      setAuthorizationUrl(null);
      return undefined;
    }

    let isActive = true;

    const refreshAuthorizationUrl = () => {
      input.api
        ?.getPendingGoogleAuthorizationUrl()
        .then((url) => {
          if (isActive) {
            setAuthorizationUrl(url);
          }

          return undefined;
        })
        .catch(() => undefined);
    };
    const intervalId = window.setInterval(refreshAuthorizationUrl, 250);

    refreshAuthorizationUrl();

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [input.api, input.isPending]);

  return authorizationUrl;
}
