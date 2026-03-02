/**
 * App.js — Nirnay Healthcare Triage System
 * Root navigation setup with Stack Navigator.
 *
 * Routes:
 *   Dashboard    → Doctor triage dashboard (web-first)
 *   PatientInput → Mobile patient vitals entry form
 *   RiskResult   → Animated risk result screen
 */

import './shims/suppress-web-warnings';

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen      from './screens/HomeScreen';
import MobileHomeScreen from './screens/MobileHomeScreen';
import RiskResultScreen from './screens/RiskResultScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{ headerShown: false, animationEnabled: true, cardStyle: { flex: 1 } }}
      >
        <Stack.Screen name="Dashboard"    component={HomeScreen} />
        <Stack.Screen name="PatientInput" component={MobileHomeScreen} />
        <Stack.Screen
          name="RiskResult"
          component={RiskResultScreen}
          options={{ gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
