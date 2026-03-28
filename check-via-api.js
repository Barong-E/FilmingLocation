// API를 통해 이태원클라쓰 등장인물 조회

async function checkItaewonViaAPI() {
  try {
    // 먼저 모든 작품 조회
    console.log('=== 모든 작품 조회 ===');
    const worksResponse = await fetch('http://localhost:5000/api/works');
    const worksData = await worksResponse.json();
    
    // 이태원클라쓰 찾기
    const itaewonWork = worksData.works.find(work => 
      work.title.includes('이태원')
    );
    
    if (!itaewonWork) {
      console.log('이태원클라쓰를 찾을 수 없습니다.');
      return;
    }
    
    console.log('\n=== 이태원클라쓰 정보 ===');
    console.log('ID:', itaewonWork._id);
    console.log('제목:', itaewonWork.title);
    console.log('characterIds:', itaewonWork.characterIds);
    console.log('characters:', itaewonWork.characters);
    
    // 각 characterId에 해당하는 인물 정보 조회
    if (itaewonWork.characterIds && itaewonWork.characterIds.length > 0) {
      console.log('\n=== 등장인물 목록 ===');
      
      for (let i = 0; i < itaewonWork.characterIds.length; i++) {
        const charId = itaewonWork.characterIds[i];
        try {
          const charResponse = await fetch(`http://localhost:5000/api/characters/${charId}`);
          const charData = await charResponse.json();
          
          if (charData.success) {
            const characterName = itaewonWork.characters && itaewonWork.characters[i] 
              ? itaewonWork.characters[i] 
              : '(극중이름 없음)';
            console.log(`${i + 1}. ${charData.character.name} (${charId}) → 극중이름: ${characterName}`);
          } else {
            console.log(`${i + 1}. [오류] ${charId} - ${charData.error?.message || '알 수 없는 오류'}`);
          }
        } catch (error) {
          console.log(`${i + 1}. [네트워크 오류] ${charId} - ${error.message}`);
        }
      }
    } else {
      console.log('등장인물이 없습니다.');
    }
    
  } catch (error) {
    console.error('오류:', error.message);
  }
}

checkItaewonViaAPI();
