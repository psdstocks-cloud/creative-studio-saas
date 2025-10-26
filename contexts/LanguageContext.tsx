import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

// A simple dictionary for translations
const translations: Record<string, Record<string, string>> = {
  en: {
    signIn: 'Sign In',
    signUp: 'Sign Up',
    home: 'Home',
    stockFullSize: 'Stock Downloader',
    aiGeneration: 'AI Generation',
    api: 'API',
    filesManager: 'Files Manager',
    settings: 'Settings',
    comingSoon: 'Coming Soon',
    availablePoints: 'Available Points',
    points: 'Points',
    signOut: 'Sign Out',
    homeTitle: 'Welcome to your Creative Studio',
    homeSubtitle: 'Your central hub for creativity. What will you create today?',
    quickActions: 'Quick Actions',
    aiImageGenerationDesc: 'Generate unique images from text prompts.',
    stockDownloaderDesc: 'Download high-quality stock assets.',
    developerApiDesc: 'Integrate our services into your apps.',
    stockDownloaderTitle: 'Stock Media Downloader',
    stockUrlLabel: 'Stock Media URL',
    stockUrlPlaceholder: 'Paste URL from a supported site...',
    getFileInfo: 'Get File Info',
    fetching: 'Fetching...',
    supportedWebsitesTitle: 'Supported Websites',
    costToDownload: 'Cost to download',
    insufficientPoints: 'Insufficient points for this download.',
    cancel: 'Cancel',
    confirmAndOrder: 'Confirm & Order',
    ordering: 'Placing your order...',
    processingOrder: 'Processing your order',
    processingOrderDesc: 'This might take a moment. We are preparing your file.',
    taskId: 'Task ID',
    fileReady: 'File is Ready!',
    fileReadyDesc: 'Your file has been processed and is ready for download.',
    startAnotherDownload: 'Start Another Download',
    downloadNow: 'Download Now',
    fileFetchError: 'Could not fetch file information. Please check the URL and try again.',
    aiGeneratorTitle: 'AI Image Generator',
    promptPlaceholder: 'e.g., An astronaut riding a horse on Mars, cinematic lighting, 4k',
    thinkingMode: 'Thinking Mode',
    enhancing: 'Enhancing...',
    generate: 'Generate',
    generationProgress: 'Generation Progress',
    promptLabel: 'Prompt:',
    percentComplete: '% Complete',
    vary: 'Vary',
    upscale: 'Upscale',
    createNew: 'Create New',
    apiDocsTitle: 'API Documentation',
    apiDocsSubtitle: 'Integrate our powerful tools into your applications.',
    authentication: 'Authentication',
    authDesc: 'Authenticate your API requests by providing your API key.',
    method1: 'Method 1: Query Parameter',
    method2: 'Method 2: Header',
    recommended: 'Recommended',
    stockDownloadManage: 'Stock Download & Management',
    stockDownloadManageDesc: 'Follow these steps to download a stock file.',
    step1: 'Step 1: Get File Info',
    step1Desc: 'Retrieve information and cost for a specific file.',
    step2: 'Step 2: Order The File',
    step2Desc: 'Place an order to start processing the file.',
    step3: 'Step 3: Check Order Status',
    step3Desc: 'Poll this endpoint to check if the file is ready.',
    step4: 'Step 4: Generate Download Link',
    step4Desc: 'Once the status is "ready", generate the final download link.',
    manageAccount: 'Manage Account',
    getBalance: 'Get Balance',
    getBalanceDesc: 'Retrieve your current account balance and user information.',
    createYourAccount: 'Create your account',
    email: 'Email address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    alreadyHaveAccount: 'Already have an account?',
    confirmationTitle: 'Check your inbox',
    confirmationMessage: 'A confirmation link has been sent to {email}. Please click the link to activate your account.',
    backToSignIn: 'Back to Sign In',
    forgotPasswordTitle: 'Forgot Password?',
    forgotPasswordInstruction: 'Enter your email and we will send you a link to reset your password.',
    sendResetLink: 'Send Reset Link',
    resetLinkSent: 'If an account with that email exists, a password reset link has been sent.',
    signInToAccount: 'Sign in to your account',
    forgotPassword: 'Forgot password?',
    dontHaveAccount: "Don't have an account?",
    createAccount: 'Create one',
    invalidCredentials: 'Invalid email or password.',
  },
  ar: {
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    home: 'الرئيسية',
    stockFullSize: 'تحميل الصور',
    aiGeneration: 'مولد الصور',
    api: 'API',
    filesManager: 'مدير الملفات',
    settings: 'الإعدادات',
    comingSoon: 'قريباً',
    availablePoints: 'النقاط المتاحة',
    points: 'نقاط',
    signOut: 'تسجيل الخروج',
    homeTitle: 'أهلاً بك في استوديو الإبداع',
    homeSubtitle: 'مركزك الإبداعي. ماذا ستبتكر اليوم؟',
    quickActions: 'إجراءات سريعة',
    aiImageGenerationDesc: 'أنشئ صورًا فريدة من النصوص.',
    stockDownloaderDesc: 'حمّل أصولًا عالية الجودة.',
    developerApiDesc: 'ادمج خدماتنا في تطبيقاتك.',
    stockDownloaderTitle: 'أداة تحميل ملفات الميديا',
    stockUrlLabel: 'رابط ملف الميديا',
    stockUrlPlaceholder: 'الصق الرابط من موقع مدعوم...',
    getFileInfo: 'جلب معلومات الملف',
    fetching: 'جاري الجلب...',
    supportedWebsitesTitle: 'المواقع المدعومة',
    costToDownload: 'تكلفة التحميل',
    insufficientPoints: 'نقاطك غير كافية لهذا التحميل.',
    cancel: 'إلغاء',
    confirmAndOrder: 'تأكيد الطلب',
    ordering: 'جاري تقديم طلبك...',
    processingOrder: 'جاري معالجة طلبك',
    processingOrderDesc: 'قد يستغرق هذا بعض الوقت. نحن نجهز ملفك.',
    taskId: 'معرف المهمة',
    fileReady: 'الملف جاهز!',
    fileReadyDesc: 'تمت معالجة ملفك وهو جاهز للتحميل.',
    startAnotherDownload: 'بدء تحميل آخر',
    downloadNow: 'التحميل الآن',
    fileFetchError: 'لا يمكن جلب معلومات الملف. يرجى التحقق من الرابط والمحاولة مرة أخرى.',
    aiGeneratorTitle: 'مولّد الصور بالذكاء الاصطناعي',
    promptPlaceholder: 'مثال: رائد فضاء يركب حصانًا على المريخ، إضاءة سينمائية، 4k',
    thinkingMode: 'وضع التفكير',
    enhancing: 'جاري التحسين...',
    generate: 'إنشاء',
    generationProgress: 'تقدم الإنشاء',
    promptLabel: 'النص:',
    percentComplete: '٪ مكتمل',
    vary: 'تغيير',
    upscale: 'تكبير',
    createNew: 'إنشاء جديد',
    apiDocsTitle: 'وثائق API',
    apiDocsSubtitle: 'ادمج أدواتنا القوية في تطبيقاتك.',
    authentication: 'المصادقة',
    authDesc: 'صادق على طلباتك عن طريق توفير مفتاح API الخاص بك.',
    method1: 'الطريقة 1: معلمة الاستعلام',
    method2: 'الطريقة 2: الترويسة',
    recommended: 'موصى به',
    stockDownloadManage: 'تحميل وإدارة المخزون',
    stockDownloadManageDesc: 'اتبع هذه الخطوات لتنزيل ملف مخزون.',
    step1: 'الخطوة 1: الحصول على معلومات الملف',
    step1Desc: 'استرداد المعلومات والتكلفة لملف معين.',
    step2: 'الخطوة 2: طلب الملف',
    step2Desc: 'قدم طلبًا لبدء معالجة الملف.',
    step3: 'الخطوة 3: التحقق من حالة الطلب',
    step3Desc: 'استعلم عن هذا العنوان للتحقق مما إذا كان الملف جاهزًا.',
    step4: 'الخطوة 4: إنشاء رابط التنزيل',
    step4Desc: 'بمجرد أن تكون الحالة "جاهزًا" ، قم بإنشاء رابط التنزيل النهائي.',
    manageAccount: 'إدارة الحساب',
    getBalance: 'الحصول على الرصيد',
    getBalanceDesc: 'استرداد رصيد حسابك الحالي ومعلومات المستخدم.',
    createYourAccount: 'أنشئ حسابك',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    alreadyHaveAccount: 'هل لديك حساب بالفعل؟',
    confirmationTitle: 'تحقق من بريدك الوارد',
    confirmationMessage: 'تم إرسال رابط تأكيد إلى {email}. يرجى النقر على الرابط لتفعيل حسابك.',
    backToSignIn: 'العودة إلى تسجيل الدخول',
    forgotPasswordTitle: 'هل نسيت كلمة المرور؟',
    forgotPasswordInstruction: 'أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور الخاصة بك.',
    sendResetLink: 'إرسال رابط إعادة التعيين',
    resetLinkSent: 'إذا كان هناك حساب بهذا البريد الإلكتروني ، فقد تم إرسال رابط إعادة تعيين كلمة المرور.',
    signInToAccount: 'تسجيل الدخول إلى حسابك',
    forgotPassword: 'هل نسيت كلمة المرور؟',
    dontHaveAccount: 'ليس لديك حساب؟',
    createAccount: 'أنشئ واحدًا',
    invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صالحة.',
  },
};

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: string, replacements?: Record<string, string>) => {
    let translation = translations[language][key] || translations['en'][key] || key;
    if (replacements) {
        Object.keys(replacements).forEach(placeholder => {
            translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
        });
    }
    return translation;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};