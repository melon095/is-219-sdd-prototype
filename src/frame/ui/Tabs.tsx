import {
  Tab as AriaTab,
  TabList as AriaTabList,
  TabPanel as AriaTabPanel,
  Tabs as AriaTabs,
  type TabListProps,
  type TabPanelProps,
  type TabProps,
  type TabsProps,
} from "react-aria-components";
import "./Navigation.css";

export function Tabs(props: TabsProps) {
  return <AriaTabs {...props} />;
}

export function TabList<T extends object>(props: TabListProps<T>) {
  return <AriaTabList {...props} />;
}

export function Tab(props: TabProps) {
  return <AriaTab {...props} />;
}

export function TabPanel(props: TabPanelProps) {
  return <AriaTabPanel {...props} />;
}
