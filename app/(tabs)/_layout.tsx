import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false, // Hide page titles
        tabBarActiveTintColor: '#1A1A1A',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: styles.floatingTabBar,
        tabBarItemStyle: styles.tabBarItem, // Taken from your reference math
        tabBarIconStyle: styles.tabBarIcon, // Taken from your reference setup
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIcon]}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIcon]}>
              <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activeIcon]}>
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const TAB_BAR_HEIGHT = 64;
const ICON_FRAME_SIZE = 42;

const styles = StyleSheet.create({
  floatingTabBar: {
    position: 'absolute',
    bottom: 25,
    height: TAB_BAR_HEIGHT,
    // 👈 FIXES THE LEFT-SIDING: Using margin horizontal centers it perfectly on any screen size
    marginHorizontal: '5%', 
    width: '90%',
    backgroundColor: '#E2F1E7', // Mint green from palette
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderTopWidth: 2, // Overrides default react-navigation style sheet gaps
    // Neo-Brutalist shadow
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  tabBarItem: {
    // 👈 FIXES VERTICAL CENTERING: Applies the custom padding math from your working code
    paddingVertical: TAB_BAR_HEIGHT / 2 - ICON_FRAME_SIZE / 1.6,
  },
  tabBarIcon: {
    // 👈 FORCES ALIGNMENT: Prevents default icon containers from dropping downwards
    width: ICON_FRAME_SIZE,
    height: ICON_FRAME_SIZE,
    alignSelf: 'center',
  },
  iconWrapper: {
    width: ICON_FRAME_SIZE,
    height: ICON_FRAME_SIZE,
    borderRadius: 21,
    justifyContent: 'center', 
    alignItems: 'center',
  },
  activeIcon: {
    backgroundColor: '#FFB6B6', // Coral pastel highlight
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
});
