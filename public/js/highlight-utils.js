// 🎨 검색어 하이라이팅 유틸리티

/**
 * 텍스트에서 검색어를 하이라이트 처리
 * @param {string} text - 원본 텍스트
 * @param {string} query - 검색어
 * @param {string} className - 하이라이트 CSS 클래스명
 * @returns {string} - 하이라이트가 적용된 HTML
 */
export function highlightText(text, query, className = 'search-highlight') {
  if (!text || !query) return text;
  
  // HTML 특수문자 이스케이프
  const escapeHtml = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // 검색어 정규화 (공백 제거, 특수문자 이스케이프)
  const normalizedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!normalizedQuery) return escapeHtml(text);

  // 대소문자 구분 없이 매칭
  const regex = new RegExp(`(${normalizedQuery})`, 'gi');
  
  // HTML 이스케이프 후 하이라이트 적용
  const escapedText = escapeHtml(text);
  return escapedText.replace(regex, `<span class="${className}">$1</span>`);
}

/**
 * 다중 검색어 하이라이팅 (공백으로 구분된 검색어들)
 * @param {string} text - 원본 텍스트
 * @param {string} query - 검색어 (공백으로 구분)
 * @param {string} className - 하이라이트 CSS 클래스명
 * @returns {string} - 하이라이트가 적용된 HTML
 */
export function highlightMultipleTerms(text, query, className = 'search-highlight') {
  if (!text || !query) return text;
  
  // 검색어를 공백으로 분리하고 정리
  const terms = query.trim()
    .split(/\s+/)
    .filter(term => term.length > 0)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  
  if (terms.length === 0) return text;
  
  // HTML 특수문자 이스케이프
  const escapeHtml = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  let result = escapeHtml(text);
  
  // 각 검색어에 대해 하이라이트 적용 (긴 검색어부터 처리)
  terms.sort((a, b) => b.length - a.length).forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    result = result.replace(regex, `<span class="${className}">$1</span>`);
  });
  
  return result;
}

/**
 * 검색어 강조를 위한 스마트 텍스트 자르기
 * @param {string} text - 원본 텍스트
 * @param {string} query - 검색어
 * @param {number} maxLength - 최대 길이
 * @param {string} ellipsis - 생략 표시
 * @returns {string} - 자른 텍스트 (검색어 포함 보장)
 */
export function smartTruncate(text, query, maxLength = 100, ellipsis = '...') {
  if (!text || text.length <= maxLength) return text;
  if (!query) return text.substring(0, maxLength) + ellipsis;
  
  // 검색어 위치 찾기
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const queryIndex = lowerText.indexOf(lowerQuery);
  
  if (queryIndex === -1) {
    // 검색어가 없으면 앞에서부터 자르기
    return text.substring(0, maxLength) + ellipsis;
  }
  
  const queryLength = lowerQuery.length;
  const halfLength = Math.floor((maxLength - queryLength) / 2);
  
  // 검색어를 중심으로 앞뒤 텍스트 계산
  let start = Math.max(0, queryIndex - halfLength);
  let end = Math.min(text.length, queryIndex + queryLength + halfLength);
  
  // 시작이나 끝이 단어 중간이면 조정
  if (start > 0 && text[start] !== ' ') {
    const spaceIndex = text.indexOf(' ', start);
    if (spaceIndex !== -1 && spaceIndex < queryIndex) {
      start = spaceIndex + 1;
    }
  }
  
  if (end < text.length && text[end] !== ' ') {
    const spaceIndex = text.lastIndexOf(' ', end);
    if (spaceIndex !== -1 && spaceIndex > queryIndex + queryLength) {
      end = spaceIndex;
    }
  }
  
  let result = text.substring(start, end);
  
  // 앞뒤 생략 표시 추가
  if (start > 0) result = ellipsis + result;
  if (end < text.length) result = result + ellipsis;
  
  return result;
}

/**
 * 검색 결과 컨텍스트 생성 (검색어 주변 텍스트)
 * @param {string} text - 원본 텍스트
 * @param {string} query - 검색어
 * @param {number} contextLength - 앞뒤 컨텍스트 길이
 * @returns {Object} - { text, hasMatch, matchCount }
 */
export function createSearchContext(text, query, contextLength = 50) {
  if (!text || !query) {
    return { text, hasMatch: false, matchCount: 0 };
  }
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const matches = [];
  let index = 0;
  
  // 모든 매칭 위치 찾기
  while ((index = lowerText.indexOf(lowerQuery, index)) !== -1) {
    matches.push(index);
    index += lowerQuery.length;
  }
  
  if (matches.length === 0) {
    return { text, hasMatch: false, matchCount: 0 };
  }
  
  // 첫 번째 매칭 위치를 중심으로 컨텍스트 생성
  const firstMatch = matches[0];
  const start = Math.max(0, firstMatch - contextLength);
  const end = Math.min(text.length, firstMatch + lowerQuery.length + contextLength);
  
  let contextText = text.substring(start, end);
  
  // 앞뒤 생략 표시
  if (start > 0) contextText = '...' + contextText;
  if (end < text.length) contextText = contextText + '...';
  
  return {
    text: contextText,
    hasMatch: true,
    matchCount: matches.length
  };
}

/**
 * DOM 요소에 하이라이트 적용
 * @param {Element} element - 대상 DOM 요소
 * @param {string} query - 검색어
 * @param {string} className - 하이라이트 CSS 클래스명
 */
export function highlightInElement(element, query, className = 'search-highlight') {
  if (!element || !query) return;
  
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const textNodes = [];
  let node;
  
  // 모든 텍스트 노드 수집
  while (node = walker.nextNode()) {
    if (node.nodeValue.trim()) {
      textNodes.push(node);
    }
  }
  
  // 각 텍스트 노드에 하이라이트 적용
  textNodes.forEach(textNode => {
    const highlightedHTML = highlightText(textNode.nodeValue, query, className);
    if (highlightedHTML !== textNode.nodeValue) {
      const wrapper = document.createElement('span');
      wrapper.innerHTML = highlightedHTML;
      textNode.parentNode.replaceChild(wrapper, textNode);
    }
  });
}

/**
 * 검색어 매칭 점수 계산
 * @param {string} text - 대상 텍스트
 * @param {string} query - 검색어
 * @returns {number} - 매칭 점수 (0-100)
 */
export function calculateMatchScore(text, query) {
  if (!text || !query) return 0;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  
  // 완전 일치
  if (lowerText === lowerQuery) return 100;
  
  // 시작 일치
  if (lowerText.startsWith(lowerQuery)) return 90;
  
  // 단어 시작 일치
  const words = lowerText.split(/\s+/);
  if (words.some(word => word.startsWith(lowerQuery))) return 80;
  
  // 포함 여부
  if (lowerText.includes(lowerQuery)) return 70;
  
  // 부분 매칭 점수 계산
  let matchCount = 0;
  const queryChars = lowerQuery.split('');
  const textChars = lowerText.split('');
  
  queryChars.forEach(char => {
    const index = textChars.indexOf(char);
    if (index !== -1) {
      matchCount++;
      textChars.splice(index, 1); // 중복 매칭 방지
    }
  });
  
  return Math.floor((matchCount / lowerQuery.length) * 50);
}

