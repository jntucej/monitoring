// tests/gate/helpers/next-navigation.ts
export const mockPush = jest.fn();
export const mockReplace = jest.fn();
export const mockRefresh = jest.fn();
export const mockBack = jest.fn();
export const mockPathname = { current: '/' };
export const mockSearchParams = new URLSearchParams();
export const mockParams: Record<string, string> = {};

export const useRouter = () => ({
  push: mockPush, replace: mockReplace, refresh: mockRefresh, back: mockBack,
  forward: jest.fn(), prefetch: jest.fn(),
});
export const usePathname = () => mockPathname.current;
export const useSearchParams = () => mockSearchParams;
export const useParams = () => mockParams;
export const redirect = (to: string) => { throw new Error(`redirect:${to}`); };
export const notFound = () => { throw new Error('notFound'); };
