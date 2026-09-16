import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "../auth/session";
import { useTheme } from "../theme/ThemeProvider";
import { APP_VARIANT } from "../api/client";
import WelcomeScreen from "../screens/shared/WelcomeScreen";
import LoginScreen from "../screens/shared/LoginScreen";
import RegisterScreen from "../screens/shared/RegisterScreen";
import ForgotScreen from "../screens/shared/ForgotScreen";
import OtpScreen from "../screens/shared/OtpScreen";
import SettingsScreen from "../screens/shared/SettingsScreen";
import NotificationsScreen from "../screens/shared/NotificationsScreen";
import PlaceholderScreen from "../screens/shared/PlaceholderScreen";
import GalleryScreen from "../screens/shared/GalleryScreen";
import ChatsScreen from "../screens/shared/ChatsScreen";
import ChatScreen from "../screens/shared/ChatScreen";
import ConsumerHome from "../screens/consumer/HomeScreen";
import RequestsScreen from "../screens/consumer/RequestsScreen";
import NewRequestScreen from "../screens/consumer/NewRequestScreen";
import InstallFormScreen from "../screens/consumer/InstallFormScreen";
import RepairFormScreen from "../screens/consumer/RepairFormScreen";
import AddPergolaScreen from "../screens/consumer/AddPergolaScreen";
import QuoteScreen from "../screens/consumer/QuoteScreen";
import RequestDetailScreen from "../screens/consumer/RequestDetailScreen";
import ReportIssueScreen from "../screens/consumer/ReportIssueScreen";
import ContractorProfileScreen from "../screens/consumer/ContractorProfileScreen";
import HouseholdScreen from "../screens/consumer/HouseholdScreen";
import RemindersScreen from "../screens/consumer/RemindersScreen";
import DocumentsScreen from "../screens/consumer/DocumentsScreen";
import PaymentMethodsScreen from "../screens/consumer/PaymentMethodsScreen";
import MrCareScreen from "../screens/consumer/MrCareScreen";
import MrCareBuyScreen from "../screens/consumer/MrCareBuyScreen";
import SubscriptionDetailScreen from "../screens/consumer/SubscriptionDetailScreen";
import MaintenanceBookingScreen from "../screens/consumer/MaintenanceBookingScreen";
import ElectronicsClaimScreen from "../screens/consumer/ElectronicsClaimScreen";
import InvoicesScreen from "../screens/consumer/InvoicesScreen";
import PergolasScreen from "../screens/consumer/PergolasScreen";
import PergolaDetailScreen from "../screens/consumer/PergolaDetailScreen";
import MoreScreen from "../screens/consumer/MoreScreen";
import ProfileScreen from "../screens/consumer/ProfileScreen";
import ContractorHome from "../screens/contractor/HomeScreen";
import JobDetailScreen from "../screens/contractor/JobDetailScreen";
import TrainingScreen from "../screens/contractor/TrainingScreen";
import LessonScreen from "../screens/contractor/LessonScreen";
import EarningsScreen from "../screens/contractor/EarningsScreen";
import OnboardingScreen from "../screens/contractor/OnboardingScreen";
import ProLoginScreen from "../screens/contractor/ProLoginScreen";
import ProForgotScreen from "../screens/contractor/ProForgotScreen";
import ProSignupScreen from "../screens/contractor/ProSignupScreen";
import ScheduleScreen from "../screens/contractor/ScheduleScreen";
import HistoryScreen from "../screens/contractor/HistoryScreen";
import ClientCommentScreen from "../screens/contractor/ClientCommentScreen";
import DisputeFormScreen from "../screens/contractor/DisputeFormScreen";
import RateClientScreen from "../screens/contractor/RateClientScreen";
import InspectionReportScreen from "../screens/contractor/InspectionReportScreen";
import ProProfileScreen from "../screens/contractor/ProProfileScreen";
import PersonalInfoScreen from "../screens/contractor/PersonalInfoScreen";
import ProSettingsScreen from "../screens/contractor/ProSettingsScreen";
import HelpScreen from "../screens/contractor/HelpScreen";
import LegalScreen from "../screens/shared/LegalScreen";
import TransactionDetailScreen from "../screens/contractor/TransactionDetailScreen";
import PayoutMethodScreen from "../screens/contractor/PayoutMethodScreen";
import StoreScreen from "../screens/store/StoreScreen";
import { StoreSearchScreen, StoreCategoriesScreen, StoreProductsScreen, StoreProductScreen } from "../screens/store/StoreProductsScreen";
import { StoreCartScreen, StoreCheckoutScreen, StoreOrdersScreen, StoreOrderScreen, StoreAddressesScreen } from "../screens/store/StoreCartScreen";

export type RootParams = {
  Welcome: undefined; Login: undefined; Register: undefined; Forgot: undefined; Otp: { email: string }; Tabs: { screen?: string } | undefined;
  NewRequest: undefined; InstallForm: { draftId?: string }; RepairForm: undefined; Quote: { id: string; others?: number; method: "ai" | "inspector" };
  RequestDetail: { id: string }; AddPergola: { key?: string }; PergolaDetail: { id: string }; Pergolas: undefined;
  ReportIssue: { id: string }; Gallery: { photos: { url: string; label?: string; at?: string }[]; index?: number };
  Chats: undefined; Chat: { id: string; title: string; closed?: boolean }; ContractorProfile: { id: string }; Documents: undefined; Household: undefined; Reminders: { pergolaId?: string } | undefined; PaymentMethods: undefined;
  MrCareBuy: { offering: "maintenance" | "electronics" }; SubscriptionDetail: { id: string }; MaintenanceBooking: { subscriptionId: string; pergolaId?: string }; ElectronicsClaim: { subscriptionId: string; pergolaId?: string };
  Profile: undefined;
  JobDetail: { id: string }; Lesson: { slug: string }; Notifications: undefined;
  Earnings: undefined; PersonalInfo: undefined; ProSettings: undefined; Help: undefined; Legal: { kind: "terms" | "privacy" }; TransactionDetail: { id: string }; PayoutMethod: undefined; Schedule: undefined; ClientComment: { id: string }; DisputeForm: { id: string }; RateClient: { id: string; confirmed?: boolean }; InspectionReport: { id: string }; Training: undefined; Store: { jobId?: string } | undefined; StoreSearch: { jobId?: string } | undefined; StoreCategories: undefined; StoreProducts: { category?: string; title?: string; favorites?: boolean; jobId?: string } | undefined; StoreProduct: { id: string; jobId?: string }; StoreCart: { jobId?: string } | undefined; StoreCheckout: { jobId?: string } | undefined; StoreOrders: undefined; StoreOrder: { id: string; track?: boolean }; StoreAddresses: undefined;
};
const Stack = createNativeStackNavigator<RootParams>();
const Tabs = createBottomTabNavigator();

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => <Ionicons name={name} color={color} size={size} />;
}

function ConsumerTabs() {
  const { c } = useTheme();
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.text4, tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, height: 86, paddingTop: 8 }, tabBarLabelStyle: { fontFamily: "Inter_600SemiBold", fontSize: 11 } }}>
      <Tabs.Screen name="Home" component={ConsumerHome} options={{ tabBarIcon: tabIcon("home-outline") }} />
      <Tabs.Screen name="Requests" component={RequestsScreen} options={{ tabBarIcon: tabIcon("reader-outline") }} />
      <Tabs.Screen name="MrCare" component={MrCareScreen} options={{ tabBarIcon: tabIcon("shield-checkmark-outline") }} />
      <Tabs.Screen name="Invoices" component={InvoicesScreen} options={{ tabBarIcon: tabIcon("receipt-outline") }} />
      <Tabs.Screen name="More" component={MoreScreen} options={{ tabBarIcon: tabIcon("grid-outline") }} />
    </Tabs.Navigator>
  );
}

function ContractorTabs() {
  const { c } = useTheme();
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.text4, tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, height: 86, paddingTop: 8 }, tabBarLabelStyle: { fontFamily: "Inter_600SemiBold", fontSize: 11 } }}>
      <Tabs.Screen name="Home" component={ContractorHome} options={{ tabBarIcon: tabIcon("home-outline") }} />
      <Tabs.Screen name="History" component={HistoryScreen} options={{ tabBarIcon: tabIcon("time-outline") }} />
      <Tabs.Screen name="Messages" component={ChatsScreen} options={{ tabBarIcon: tabIcon("chatbubble-ellipses-outline") }} />
      <Tabs.Screen name="Profile" component={ProProfileScreen} options={{ tabBarIcon: tabIcon("person-circle-outline") }} />
    </Tabs.Navigator>
  );
}

export default function RootNavigator() {
  const { user, ready } = useSession();
  const { c, dark } = useTheme();
  const theme = { ...(dark ? DarkTheme : DefaultTheme), colors: { ...(dark ? DarkTheme : DefaultTheme).colors, background: c.bg, card: c.surface, text: c.text, primary: c.primary, border: c.border } };
  if (!ready) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}><ActivityIndicator color={c.primary} /></View>;
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={APP_VARIANT === "contractor" ? OnboardingScreen : WelcomeScreen} />
            <Stack.Screen name="Login" component={APP_VARIANT === "contractor" ? ProLoginScreen : LoginScreen} />
            <Stack.Screen name="Register" component={APP_VARIANT === "contractor" ? ProSignupScreen : RegisterScreen} />
            <Stack.Screen name="Forgot" component={APP_VARIANT === "contractor" ? ProForgotScreen : ForgotScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Tabs" component={APP_VARIANT === "contractor" ? ContractorTabs : ConsumerTabs} />
            <Stack.Screen name="NewRequest" component={NewRequestScreen} />
            <Stack.Screen name="InstallForm" component={InstallFormScreen} />
            <Stack.Screen name="RepairForm" component={RepairFormScreen} />
            <Stack.Screen name="Quote" component={QuoteScreen} />
            <Stack.Screen name="AddPergola" component={AddPergolaScreen} />
            <Stack.Screen name="PergolaDetail" component={PergolaDetailScreen} />
            <Stack.Screen name="Pergolas" component={PergolasScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
            <Stack.Screen name="ReportIssue" component={ReportIssueScreen} />
            <Stack.Screen name="Gallery" component={GalleryScreen} options={{ presentation: "fullScreenModal" }} />
            <Stack.Screen name="Chats" component={ChatsScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="ContractorProfile" component={ContractorProfileScreen} />
            <Stack.Screen name="Documents" component={DocumentsScreen} />
            <Stack.Screen name="Household" component={HouseholdScreen} />
            <Stack.Screen name="Reminders" component={RemindersScreen} />
            <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
            <Stack.Screen name="MrCareBuy" component={MrCareBuyScreen} />
            <Stack.Screen name="SubscriptionDetail" component={SubscriptionDetailScreen} />
            <Stack.Screen name="MaintenanceBooking" component={MaintenanceBookingScreen} />
            <Stack.Screen name="ElectronicsClaim" component={ElectronicsClaimScreen} />
            <Stack.Screen name="Otp" component={OtpScreen} />
            <Stack.Screen name="JobDetail" component={JobDetailScreen} />
            <Stack.Screen name="Schedule" component={ScheduleScreen} />
            <Stack.Screen name="ClientComment" component={ClientCommentScreen} />
            <Stack.Screen name="DisputeForm" component={DisputeFormScreen} />
            <Stack.Screen name="RateClient" component={RateClientScreen} />
            <Stack.Screen name="InspectionReport" component={InspectionReportScreen} />
            <Stack.Screen name="Training" component={TrainingScreen} />
            <Stack.Screen name="Earnings" component={EarningsScreen} />
            <Stack.Screen name="Store" component={StoreScreen} />
            <Stack.Screen name="StoreSearch" component={StoreSearchScreen} />
            <Stack.Screen name="StoreCategories" component={StoreCategoriesScreen} />
            <Stack.Screen name="StoreProducts" component={StoreProductsScreen} />
            <Stack.Screen name="StoreProduct" component={StoreProductScreen} />
            <Stack.Screen name="StoreCart" component={StoreCartScreen} />
            <Stack.Screen name="StoreCheckout" component={StoreCheckoutScreen} />
            <Stack.Screen name="StoreOrders" component={StoreOrdersScreen} />
            <Stack.Screen name="StoreOrder" component={StoreOrderScreen} />
            <Stack.Screen name="StoreAddresses" component={StoreAddressesScreen} />
            <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
            <Stack.Screen name="ProSettings" component={ProSettingsScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="Legal" component={LegalScreen} />
            <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
            <Stack.Screen name="PayoutMethod" component={PayoutMethodScreen} />
            <Stack.Screen name="Lesson" component={LessonScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
