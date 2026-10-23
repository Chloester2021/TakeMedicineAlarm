const { withAndroidManifest } = require('expo/config-plugins')
module.exports = function withCalmAlarm(config) {
  return withAndroidManifest(config, (config) => {
    const m = config.modResults.manifest
    const perms = m['uses-permission'] || (m['uses-permission'] = [])
    for (const name of [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ]) {
      if (!perms.some((x) => x.$['android:name'] === name))
        perms.push({ $: { 'android:name': name } })
    }
    const app = m.application[0]
    const components = [
      [
        'receiver',
        'expo.modules.calmalarm.AlarmReceiver',
        { 'android:exported': 'false' },
      ],
      [
        'service',
        'expo.modules.calmalarm.AlarmService',
        {
          'android:exported': 'false',
          'android:foregroundServiceType': 'mediaPlayback',
        },
      ],
      [
        'activity',
        'expo.modules.calmalarm.AlarmActivity',
        {
          'android:exported': 'false',
          'android:showWhenLocked': 'true',
          'android:turnScreenOn': 'true',
          'android:excludeFromRecents': 'true',
          'android:theme': '@android:style/Theme.Material.Light.NoActionBar',
        },
      ],
    ]
    for (const [tag, name, attrs] of components) {
      const arr = app[tag] || (app[tag] = [])
      if (!arr.some((x) => x.$['android:name'] === name))
        arr.push({ $: { 'android:name': name, ...attrs } })
    }
    const receivers = app.receiver || (app.receiver = [])
    const restoreName = 'expo.modules.calmalarm.AlarmRestoreReceiver'
    let restore = receivers.find((x) => x.$['android:name'] === restoreName)
    if (!restore) {
      restore = { $: { 'android:name': restoreName, 'android:exported': 'true' } }
      receivers.push(restore)
    }
    restore['intent-filter'] = [{ action: [
      'android.intent.action.BOOT_COMPLETED',
      'android.intent.action.TIME_SET',
      'android.intent.action.TIMEZONE_CHANGED',
      'android.intent.action.MY_PACKAGE_REPLACED',
      'android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED',
    ].map((name) => ({ $: { 'android:name': name } })) }]
    return config
  })
}
