import { RouterProvider as AriaRouterProvider } from "react-aria-components";
import {
  createHashRouter,
  Outlet,
  type RouteObject,
  useHref,
  useNavigate,
} from "react-router";
import { PageLayout } from "../frame/layout/PageLayout";
import { PageFocusProvider, PageHeading } from "../frame/ui/PageHeading";
import { features } from "./features";

function RootRoute() {
  const navigate = useNavigate();

  return (
    <AriaRouterProvider navigate={(to) => navigate(to)} useHref={useHref}>
      <PageFocusProvider>
        <PageLayout>
          <Outlet />
        </PageLayout>
      </PageFocusProvider>
    </AriaRouterProvider>
  );
}

const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootRoute />,
    children: [
      { index: true, element: <PageHeading>Hjem</PageHeading> },
      ...features.flatMap((feature) => feature.routes),
    ],
  },
];

export const router = createHashRouter(routes);
