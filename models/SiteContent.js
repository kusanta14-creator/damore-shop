const mongoose = require('mongoose');

const footerSnsSchema = new mongoose.Schema(
  {
    type: { type: String, default: 'instagram', trim: true },
    url: { type: String, default: '#', trim: true },
    label: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const siteContentSchema = new mongoose.Schema(
  {
    philosophyTitle: { type: String, default: '' },
    philosophyDesc: { type: String, default: '' },
    philosophyKeywords: { type: String, default: '' },

    newSectionTitle: { type: String, default: '' },
    newSectionDesc: { type: String, default: '' },

    collectionTitle: { type: String, default: '' },
    collectionDesc: { type: String, default: '' },

    editorialTitle: { type: String, default: '' },
    editorialDesc: { type: String, default: '' },

    aboutTitle: { type: String, default: '' },
    aboutDesc: { type: String, default: '' },

    aboutHeroEyebrow: { type: String, default: 'About DAMORE' },
    aboutHeroTitle: { type: String, default: '' },
    aboutHeroDesc: { type: String, default: '' },

    aboutImageBannerTitle: { type: String, default: '' },
    aboutImageBannerDesc: { type: String, default: '' },

    aboutTextCardLabel: { type: String, default: 'Brand Identity' },
    aboutTextCardTitle: { type: String, default: '' },
    aboutTextCardDesc: { type: String, default: '' },

    aboutKeywordTitle: { type: String, default: '브랜드 핵심 키워드' },
    aboutKeywordDesc: { type: String, default: '' },

    identitySectionLabel: { type: String, default: 'Identity' },
    identitySectionTitle: { type: String, default: '' },
    identitySectionDesc: { type: String, default: '' },

    identity1Title: { type: String, default: '' },
    identity1Desc: { type: String, default: '' },
    identity2Title: { type: String, default: '' },
    identity2Desc: { type: String, default: '' },
    identity3Title: { type: String, default: '' },
    identity3Desc: { type: String, default: '' },

    sceneSectionLabel: { type: String, default: 'Brand Scene' },
    sceneSectionTitle: { type: String, default: '' },
    sceneSectionDesc: { type: String, default: '' },

    moodSectionLabel: { type: String, default: 'Editorial Mood' },
    moodSectionTitle: { type: String, default: '' },
    moodSectionDesc: { type: String, default: '' },

    moodCard1Label: { type: String, default: '01' },
    moodCard1Title: { type: String, default: '' },
    moodCard1Desc: { type: String, default: '' },

    moodCard2Label: { type: String, default: '02' },
    moodCard2Title: { type: String, default: '' },
    moodCard2Desc: { type: String, default: '' },

    moodCard3Label: { type: String, default: '03' },
    moodCard3Title: { type: String, default: '' },
    moodCard3Desc: { type: String, default: '' },

    footerBrandName: { type: String, default: 'DAMORE' },
    footerDesc: {
      type: String,
      default: '더 많은 스타일, 더 많은 확장성, 그리고 오래 남는 무드를 만드는 브랜드.'
    },

    footerCsLabel: { type: String, default: '고객센터' },
    footerCsPhone: { type: String, default: '1644-4370' },
    footerCsTime1: {
      type: String,
      default: '평일 AM 09:00 ~ PM 16:00 / 점심 PM 12:00 ~ PM 1:00'
    },
    footerCsTime2: {
      type: String,
      default: '토/일요일/공휴일 휴무'
    },

    footerBankTitle: { type: String, default: 'BANK ACCOUNT' },
    footerBank1: { type: String, default: '국민은행 371137-04-009969' },
    footerBank2: { type: String, default: '하나은행 112-910016-50404' },
    footerBank3: { type: String, default: '우리은행 1005-204-805182' },
    footerDepositor: { type: String, default: '예금주 : (주)문파크' },
    footerBankNotice: {
      type: String,
      default: '※ 주문자명과 입금자명이 다를 경우에 입금확인이 지연될 수 있습니다'
    },

    footerBizTitle: { type: String, default: 'BUSINESS INFO' },
    footerBizName: { type: String, default: '주식회사 다모어' },
    footerBizOwner: { type: String, default: '홍길동' },
    footerBizAddress: { type: String, default: '서울특별시 강남구 예시로 123, 5층' },
    footerBizNumber: { type: String, default: '123-45-67890' },
    footerBizOnline: { type: String, default: '제2026-서울강남-0000호' },
    footerBizPrivacyManager: { type: String, default: '홍길동' },

    footerCustomerTitle: { type: String, default: 'CUSTOMER' },

    footerTermsLink: { type: String, default: '#' },
    footerPrivacyLink: { type: String, default: '#' },
    footerBizInfoLink: { type: String, default: '#' },

    footerCopyright: {
      type: String,
      default: '© 2026 DAMORE. All rights reserved.'
    },
    footerSlogan: {
      type: String,
      default: 'THE MORE, THE MOOD.'
    },

    footerSns: {
      type: [footerSnsSchema],
      default: [
        { type: 'instagram', url: '#', label: 'Instagram' },
        { type: 'kakao', url: '#', label: 'KakaoTalk' }
      ]
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.SiteContent || mongoose.model('SiteContent', siteContentSchema);