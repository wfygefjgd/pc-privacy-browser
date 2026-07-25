/**
 * 随机身份生成器
 * 每次启动生成完全随机的浏览器身份
 */
export class IdentityGenerator {
  /**
   * 生成随机的完整身份
   */
  static generateIdentity() {
    const platform = this.randomPlatform();
    const screen = this.randomScreen();
    const hardware = this.randomHardware();
    const locale = this.randomLocale();
    const timezone = this.randomTimezone();

    return {
      platform,
      screen,
      hardware,
      locale,
      timezone,
      userAgent: this.generateUserAgent(platform),
    };
  }

  /**
   * 随机平台
   */
  private static randomPlatform() {
    const platforms = [
      { name: 'Win32', os: 'Windows NT 10.0' },
      { name: 'Win32', os: 'Windows NT 11.0' },
      { name: 'MacIntel', os: 'Macintosh; Intel Mac OS X 10_15_7' },
      { name: 'Linux x86_64', os: 'X11; Linux x86_64' },
    ];
    return platforms[Math.floor(Math.random() * platforms.length)];
  }

  /**
   * 随机屏幕分辨率
   */
  private static randomScreen() {
    const screens = [
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
      { width: 1680, height: 1050 },
      { width: 1440, height: 900 },
      { width: 3840, height: 2160 },
    ];
    return screens[Math.floor(Math.random() * screens.length)];
  }

  /**
   * 随机硬件配置
   */
  private static randomHardware() {
    const configs = [
      { cores: 4, memory: 8 },
      { cores: 6, memory: 16 },
      { cores: 8, memory: 16 },
      { cores: 8, memory: 32 },
      { cores: 12, memory: 32 },
      { cores: 16, memory: 64 },
    ];
    return configs[Math.floor(Math.random() * configs.length)];
  }

  /**
   * 随机语言/地区
   */
  private static randomLocale() {
    const locales = [
      { lang: 'en-US', langs: ['en-US', 'en'] },
      { lang: 'en-GB', langs: ['en-GB', 'en'] },
      { lang: 'de-DE', langs: ['de-DE', 'de', 'en'] },
      { lang: 'fr-FR', langs: ['fr-FR', 'fr', 'en'] },
      { lang: 'ja-JP', langs: ['ja-JP', 'ja', 'en'] },
      { lang: 'zh-CN', langs: ['zh-CN', 'zh', 'en'] },
    ];
    return locales[Math.floor(Math.random() * locales.length)];
  }

  /**
   * 随机时区
   */
  private static randomTimezone() {
    const timezones = [
      { name: 'America/New_York', offset: -300 },
      { name: 'America/Los_Angeles', offset: -480 },
      { name: 'Europe/London', offset: 0 },
      { name: 'Europe/Paris', offset: 60 },
      { name: 'Asia/Tokyo', offset: 540 },
      { name: 'Asia/Shanghai', offset: 480 },
      { name: 'Australia/Sydney', offset: 600 },
    ];
    return timezones[Math.floor(Math.random() * timezones.length)];
  }

  /**
   * 生成 User-Agent
   */
  private static generateUserAgent(platform: any) {
    const chromeVersions = ['120.0.6099.109', '121.0.6167.85', '122.0.6261.94', '123.0.6312.58'];
    const chromeVersion = chromeVersions[Math.floor(Math.random() * chromeVersions.length)];

    if (platform.name === 'Win32') {
      return `Mozilla/5.0 (${platform.os}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    } else if (platform.name === 'MacIntel') {
      return `Mozilla/5.0 (${platform.os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    } else {
      return `Mozilla/5.0 (${platform.os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
    }
  }
}
