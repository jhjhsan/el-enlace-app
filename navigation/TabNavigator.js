export default function TabNavigator() {
  const { unreadCount } = useNotification(); // Obtiene el contador de notificaciones no leídas desde el contexto

  return (
    <Tab.Navigator
      key={`noti-${unreadCount}`} // 👈 Esto fuerza a redibujar el TabNavigator cuando `unreadCount` cambia
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#D8A353',
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 5,
        },
        tabBarActiveTintColor: '#D8A353',
        tabBarInactiveTintColor: '#999',
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = 'home';
          else if (route.name === 'ExploreProfiles') iconName = 'search';
          else if (route.name === 'PublishMenu') iconName = 'add-circle';
          else if (route.name === 'Notifications') iconName = 'notifications';
          else if (route.name === 'Menu') iconName = 'menu';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="ExploreProfiles" component={ExploreProfilesScreen} />
      <Tab.Screen name="PublishMenu" component={PublishMenuScreen} />
      <Tab.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : null, // Muestra el contador si hay notificaciones no leídas
          tabBarBadgeStyle: {
            backgroundColor: '#FF4444', // Estilo del contador (rojo)
            color: '#fff',
            fontSize: 11,
            fontWeight: 'bold',
          },
        }}
      />
      <Tab.Screen name="Menu" component={MenuScreen} />
    </Tab.Navigator>
  );
}
