import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Animated, PanResponder, Platform, Alert, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg: '#08090A', panel: '#151719', panel2: '#202326',
  text: '#F2F3F4', muted: '#92979C', purple: '#C5C9CD',
  line: '#2B3034', accent: '#D9DDE0'
};



function Plasma({ style }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <LinearGradient
        colors={['#25292D', '#08090A', '#171B1E', '#08090A']}
        locations={[0, 0.42, 0.72, 1]}
        start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
    </View>
  );
}

function Artwork({ size = 58, variant = 0 }) {
  const palettes = [
    ['#AEB4B8', '#51585D', '#111315'],
    ['#858D92', '#3D4449', '#101214'],
    ['#C4C8CA', '#62696D', '#111315']
  ];
  return (
    <LinearGradient colors={palettes[variant % palettes.length]} style={[styles.art, { width: size, height: size, borderRadius: Math.max(10, size * 0.16) }]}>
      <View style={[styles.artOrb, { width: size * 0.62, height: size * 0.62, borderRadius: size }]} />
      <View style={[styles.artRing, { width: size * 0.82, height: size * 0.82, borderRadius: size }]} />
    </LinearGradient>
  );
}

function formatTime(value = 0) {
  const n = Math.max(0, Math.floor(value));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState('Home');
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [queue, setQueue] = useState([]);
  const [repeat, setRepeat] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [shuffle, setShuffle] = useState(false);
  const [catalogArtists, setCatalogArtists] = useState([]);
  const [catalogTracks, setCatalogTracks] = useState([]);
  const [popularTracks, setPopularTracks] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');

  const expandAnim = useRef(new Animated.Value(0)).current;
  const current = allTracks.find(t => t.id === currentId) || null;
  const allTracks = useMemo(() => [...tracks, ...popularTracks, ...catalogTracks], [tracks, popularTracks, catalogTracks]);

  useEffect(() => {
    let active = true;
    fetch('https://api.deezer.com/chart/0/tracks?limit=30')
      .then(r => r.json())
      .then(data => {
        if (!active || !Array.isArray(data.data)) return;
        setPopularTracks(data.data.map(t => ({
          id: `deezer-${t.id}`, title: t.title, artist: t.artist?.name || 'Unknown artist',
          uri: t.preview || null, cover: t.album?.cover_medium, externalUrl: t.link,
          duration: t.duration, source: 'Deezer'
        })));
      })
      .catch(() => { if (active) setCatalogError('Не удалось загрузить чарты. Проверь подключение к интернету.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const term = query.trim();
    if (!term) {
      setCatalogArtists([]);
      setCatalogTracks([]);
      setCatalogLoading(false);
      return () => { active = false; };
    }
    setCatalogLoading(true);
    const timer = setTimeout(() => {
      Promise.all([
        fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(term)}&limit=50`).then(r => r.json()),
        fetch(`https://api.deezer.com/search/track?q=${encodeURIComponent(term)}&limit=50`).then(r => r.json())
      ]).then(([artists, tracksResult]) => {
        if (!active) return;
        setCatalogArtists((artists.data || []).map(a => ({
          name: a.name, genre: 'Исполнитель · мировой каталог',
          bio: 'Профиль из музыкального каталога.',
          id: a.id, picture: a.picture_medium, fans: a.nb_fan, link: a.link
        })));
        setCatalogTracks((tracksResult.data || []).map(t => ({
          id: `deezer-${t.id}`, title: t.title, artist: t.artist?.name || 'Неизвестный исполнитель',
          uri: t.preview || null, cover: t.album?.cover_medium, externalUrl: t.link,
          duration: t.duration, source: 'Deezer'
        })));
      }).catch(() => {
        if (active) { setCatalogArtists([]); setCatalogTracks([]); }
      }).finally(() => { if (active) setCatalogLoading(false); });
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    return () => { if (sound) sound.unloadAsync(); };
  }, [sound]);

  const onPlaybackStatus = useCallback(status => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);
    setIsPlaying(!!status.isPlaying);
    if (status.didJustFinish && !repeat) nextTrack();
    if (status.didJustFinish && repeat && sound) sound.replayAsync();
  }, [sound, repeat, tracks, currentId]);

  async function loadTrack(track, autoplay = true) {
    if (!track) return;
    if (!track.uri) {
      if (sound) {
        try { await sound.stopAsync(); await sound.unloadAsync(); } catch {}
        setSound(null);
      }
      setIsPlaying(false);
      setCurrentId(track.id);
      setExpanded(true);
      Alert.alert('Превью недоступно', 'Для этой записи музыкальный каталог не предоставил короткое аудио-превью.');
      return;
    }
    try {
      if (sound) await sound.unloadAsync();
      const { sound: nextSound, status } = await Audio.Sound.createAsync(
        { uri: track.uri },
        { shouldPlay: autoplay, progressUpdateIntervalMillis: 400 },
        onPlaybackStatus
      );
      setSound(nextSound);
      setCurrentId(track.id);
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(autoplay);
    } catch (e) {
      Alert.alert('Не удалось открыть аудио', 'Проверь, что файл доступен и имеет поддерживаемый формат.');
    }
  }

  async function togglePlay() {
    if (!current) {
      if (tracks.length) return loadTrack(tracks[0]);
      return popularTracks[0] ? loadTrack(popularTracks[0]) : Alert.alert('Каталог недоступен', 'Проверь подключение к интернету.');
    }
    if (!current.uri) {
      return Alert.alert('Превью недоступно', 'Для этой записи нет доступного аудио-превью.');
    }
    if (!sound) return loadTrack(current);
    try {
      const status = await sound.getStatusAsync();
      if (status.isPlaying) await sound.pauseAsync();
      else await sound.playAsync();
    } catch {}
  }

  async function nextTrack() {
    const playable = allTracks.filter(t => t.uri);
    if (!playable.length) return;
    let index = playable.findIndex(t => t.id === currentId);
    if (shuffle && playable.length > 1) {
      let next = index;
      while (next === index) next = Math.floor(Math.random() * playable.length);
      index = next;
    } else index = (index + 1 + playable.length) % playable.length;
    await loadTrack(playable[index]);
  }

  async function previousTrack() {
    const playable = allTracks.filter(t => t.uri);
    if (!playable.length) return;
    if (position > 3000 && sound) return sound.setPositionAsync(0);
    const index = playable.findIndex(t => t.id === currentId);
    await loadTrack(playable[(index - 1 + playable.length) % playable.length]);
  }


  function openPlayer() {
    setExpanded(true);
    Animated.spring(expandAnim, { toValue: 1, useNativeDriver: true, damping: 24, stiffness: 170, mass: 0.85 }).start();
  }
  function closePlayer() {
    Animated.spring(expandAnim, { toValue: 0, useNativeDriver: true, damping: 25, stiffness: 190 }).start(({ finished }) => {
      if (finished) setExpanded(false);
    });
  }

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderRelease: (_, g) => { if (g.dy > 75) closePlayer(); }
  })).current;

  const filtered = [...tracks, ...catalogTracks, ...popularTracks].filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i && `${t.title} ${t.artist}`.toLowerCase().includes(query.toLowerCase()));
  const artistNames = [...new Set(allTracks.flatMap(t => String(t.artist || '').split(',').map(a => a.trim()).filter(Boolean)))];
  const visibleArtists = catalogArtists;
  const artistTracks = selectedArtist ? allTracks.filter(t => String(t.artist || '').split(',').map(a => a.trim()).includes(selectedArtist)) : [];
  const isFavorite = current && favorites.includes(current.id);

  async function seekTo(value) {
    const ms = Math.max(0, Math.min(duration, value * duration / 100));
    setPosition(ms);
    if (sound) try { await sound.setPositionAsync(ms); } catch {}
  }

  const miniTranslate = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 110] });
  const fullTranslate = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [42, 0] });
  const fullOpacity = expandAnim;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.root}>
        <Plasma />
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>PULSE<Text style={{ color: C.purple }}>.</Text></Text>
            <Text style={styles.tagline}>MUSIC. YOUR WAY.</Text>
          </View>
          <TouchableOpacity style={styles.avatar}><Text style={{ color: C.purple, fontSize: 18 }}>◉</Text></TouchableOpacity>
        </View>

        {tab === 'Home' && !selectedArtist && (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>МУЗЫКА В ТВОЁМ РИТМЕ</Text>
            <Text style={styles.heroTitle}>Enter the{' '}
              <Text style={{ color: C.purple }}>frequency.</Text>
            </Text>
            <Text style={styles.sub}>Музыка без границ.</Text>
            <LinearGradient colors={['#303538', '#171A1C', '#292E31']} style={styles.banner}>
              <Text style={styles.eyebrowPurple}>PULSE COLLECTION</Text>
              <Text style={styles.bannerTitle}>Your night.{"\n"}Your soundtrack.</Text>
              <Text style={styles.sub}>Одна библиотека для твоего звука.</Text>
              <View style={styles.bannerOrb} />
            </LinearGradient>
            <Section title="Популярное сейчас" action="Обновляется онлайн" />
            {popularTracks.slice(0, 10).map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} active={currentId === t.id} onPress={() => loadTrack(t)} />
            ))}
            {!!catalogError && <Text style={styles.sub}>{catalogError}</Text>}
            <Section title="Избранное" action={`${favorites.length} треков`} />
            {favorites.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>♫</Text>
                <Text style={styles.trackTitle}>Избранное</Text>
                <Text style={styles.sub}>Сохраняй понравившиеся треки в избранное</Text>
              </View>
            ) : allTracks.filter(t => favorites.includes(t.id)).slice(0, 4).map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} active={currentId === t.id} onPress={() => loadTrack(t)} />
            ))}
            <Section title="Исполнители" action={`${artistNames.length} профилей`} />
            {artistNames.length ? artistNames.slice(0, 8).map((artist, i) => (
              <TouchableOpacity key={artist} style={styles.trackRow} onPress={() => setSelectedArtist(artist)}>
                <LinearGradient colors={['#60686D','#171A1C']} style={styles.artistAvatar}><Text style={styles.artistInitial}>{artist.slice(0,1).toUpperCase()}</Text></LinearGradient>
                <View style={{flex:1}}><Text style={styles.trackTitle}>{artist}</Text><Text style={styles.sub}>{allTracks.filter(t=>String(t.artist).split(',').map(a=>a.trim()).includes(artist)).length} треков в библиотеке</Text></View><Text style={{color:C.purple}}>›</Text>
              </TouchableOpacity>
            )) : <Text style={styles.sub}>Популярные исполнители появятся здесь по мере загрузки каталога.</Text>}
            <Section title="Каталог артистов" action="Все жанры и страны" />
            <TouchableOpacity style={styles.importButton} onPress={() => setTab('Search')}>
              <Text style={styles.importText}>⌕  Искать артистов и музыку по всему каталогу</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {tab === 'Search' && !selectedArtist && (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Поиск</Text>
            <TextInput value={query} onChangeText={setQuery} placeholder="Трек, артист или жанр" placeholderTextColor={C.muted} style={styles.search} />
            <Text style={styles.mutedSmall}>Поиск по каталогу Deezer. Доступность треков и коротких превью зависит от правообладателей.</Text>
            <ScrollView>
              <Section title="Жанры" action="Выбери направление" />
              <View style={styles.genreWrap}>
                {['Русский рэп', 'Шансон', 'Поп', 'Рок', 'Инди', 'Электроника', 'Джаз', 'Классика', 'R&B', 'Хип-хоп'].map(genre => (
                  <TouchableOpacity key={genre} style={styles.genreChip} onPress={() => setQuery(genre)}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Section title="Найденные треки" action={`${filtered.length}`} />
              {filtered.map((t, i) => <TrackRow key={t.id} track={t} index={i} active={currentId === t.id} onPress={() => loadTrack(t)} />)}
              <Section title="Артисты со всего мира" action={catalogLoading ? 'Поиск…' : `${visibleArtists.length} результатов`} />
              {visibleArtists.map(artist => (
                <TouchableOpacity key={artist.name} style={styles.trackRow} onPress={() => setSelectedArtist(artist.name)}>
                  <LinearGradient colors={['#60686D','#171A1C']} style={styles.artistAvatar}><Text style={styles.artistInitial}>{artist.name.slice(0,1).toUpperCase()}</Text></LinearGradient>
                  <View style={{flex:1}}><Text style={styles.trackTitle}>{artist.name}</Text><Text style={styles.sub}>{artist.genre}</Text></View><Text style={{color:C.purple}}>›</Text>
                </TouchableOpacity>
              ))}
              {!filtered.length && !visibleArtists.length && !catalogLoading && <Text style={styles.sub}>Введи имя артиста для поиска по мировому каталогу.</Text>}
            </ScrollView>
          </View>
        )}

        {tab === 'Library' && !selectedArtist && (
          <View style={styles.content}>
            <Section title="Моя библиотека" action={`${allTracks.length} доступно`} />
            <ScrollView>
              {allTracks.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i).map((t, i) => <TrackRow key={t.id} track={t} index={i} active={currentId === t.id} onPress={() => loadTrack(t)} />)}
              {!allTracks.length && <Text style={styles.sub}>Каталог появится после подключения к интернету.</Text>}
            </ScrollView>
            <Section title="Избранное" />
            {allTracks.filter(t => favorites.includes(t.id)).map((t, i) => <TrackRow key={t.id} track={t} index={i} onPress={() => loadTrack(t)} />)}
          </View>
        )}

        {selectedArtist && (
          <View style={styles.content}>
            <TouchableOpacity onPress={() => setSelectedArtist(null)} style={styles.backButton}><Text style={styles.importText}>‹  Все исполнители</Text></TouchableOpacity>
            <LinearGradient colors={['#444B4F','#191D1F','#09090D']} style={styles.artistHero}>
              <View style={styles.artistBigAvatar}><Text style={styles.artistBigInitial}>{selectedArtist.slice(0,1).toUpperCase()}</Text></View>
              <Text style={styles.artistName}>{selectedArtist}</Text>
              <Text style={styles.sub}>{catalogArtists.find(a => a.name === selectedArtist)?.genre || 'Исполнитель из каталога'}</Text>
              <Text style={styles.mutedSmall}>{catalogArtists.find(a => a.name === selectedArtist)?.bio || 'Профиль исполнителя из мирового каталога.'}</Text>
              <Text style={styles.mutedSmall}>{artistTracks.length} треков в твоей библиотеке</Text>
            </LinearGradient>
            <Section title="Треки исполнителя" />
            <ScrollView>{artistTracks.map((t,i)=><TrackRow key={t.id} track={t} index={i} active={currentId===t.id} onPress={()=>loadTrack(t)}/>)}</ScrollView>
          </View>
        )}

        {!selectedArtist && <View style={styles.bottomNav}>
          {[['Home', '⌂', 'Главная'], ['Search', '⌕', 'Поиск'], ['Library', '▤', 'Библиотека']].map(([key, icon, label]) => (
            <TouchableOpacity key={key} onPress={() => setTab(key)} style={styles.navItem}>
              <Text style={[styles.navIcon, tab === key && styles.navActive]}>{icon}</Text>
              <Text style={[styles.navLabel, tab === key && styles.navActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>}

        {current && !expanded && (
          <Animated.View style={[styles.miniPlayer, { transform: [{ translateY: miniTranslate }], opacity: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
            <TouchableOpacity style={styles.miniMain} onPress={openPlayer}>
              <Artwork size={46} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.trackTitle}>{current.title}</Text>
                <Text numberOfLines={1} style={styles.sub}>{current.artist}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlay} style={styles.miniControl}><Text style={styles.controlText}>{isPlaying ? 'Ⅱ' : '▶'}</Text></TouchableOpacity>
            <TouchableOpacity onPress={nextTrack} style={styles.miniControl}><Text style={styles.controlText}>≫</Text></TouchableOpacity>
            <TouchableOpacity onPress={openPlayer} style={styles.miniControl}><Text style={styles.controlText}>⌃</Text></TouchableOpacity>
          </Animated.View>
        )}

        {expanded && current && (
          <Animated.View style={[styles.fullPlayer, { opacity: fullOpacity, transform: [{ translateY: fullTranslate }] }]}>
            <View style={styles.fullTop} {...pan.panHandlers}>
              <TouchableOpacity onPress={closePlayer} style={styles.closeButton}><Text style={styles.closeGlyph}>⌄</Text></TouchableOpacity>
              <View style={{ alignItems: 'center' }}><Text style={styles.eyebrow}>NOW PLAYING</Text><Text style={styles.fullTopTitle}>СЕЙЧАС ИГРАЕТ</Text></View>
              <TouchableOpacity style={styles.closeButton}><Text style={styles.closeGlyph}>•••</Text></TouchableOpacity>
            </View>
            <View style={styles.fullContent} {...pan.panHandlers}>
              <View style={styles.bigArtworkWrap}><Artwork size={290} variant={tracks.findIndex(t => t.id === current.id)} /></View>
              <View style={styles.songInfo}>
                <View style={{ flex: 1 }}><Text style={styles.bigSongTitle} numberOfLines={1}>{current.title}</Text><Text style={styles.sub}>{current.artist}</Text></View>
                <TouchableOpacity onPress={() => setFavorites(prev => isFavorite ? prev.filter(x => x !== current.id) : [...prev, current.id])}><Text style={styles.heart}>{isFavorite ? '♥' : '♡'}</Text></TouchableOpacity>
              </View>
              <View style={styles.progressArea}>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${duration ? position / duration * 100 : 0}%` }]} /></View>
                <View style={styles.timeRow}><Text style={styles.time}>{formatTime(position / 1000)}</Text><Text style={styles.time}>{formatTime(duration / 1000)}</Text></View>
              </View>
              <View style={styles.controls}>
                <TouchableOpacity onPress={() => setShuffle(v => !v)}><Text style={[styles.sideControl, shuffle && { color: C.purple }]}>⤨</Text></TouchableOpacity>
                <TouchableOpacity onPress={previousTrack}><Text style={styles.skip}>|◀</Text></TouchableOpacity>
                <TouchableOpacity onPress={togglePlay} style={styles.playButton}><Text style={styles.playGlyph}>{isPlaying ? 'Ⅱ' : '▶'}</Text></TouchableOpacity>
                <TouchableOpacity onPress={nextTrack}><Text style={styles.skip}>▶|</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setRepeat(v => !v)}><Text style={[styles.sideControl, repeat && { color: C.purple }]}>↻</Text></TouchableOpacity>
              </View>
              <View style={styles.playerFooter}><Text style={styles.sub}>▤ Очередь</Text><Text style={styles.sub}>⌁ Устройства</Text><Text style={styles.sub}>↗ Поделиться</Text></View>
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

function Section({ title, action }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action ? <Text style={styles.mutedSmall}>{action}</Text> : null}</View>;
}

function TrackRow({ track, index, active, onPress }) {
  return (
    <TouchableOpacity style={styles.trackRow} onPress={onPress}>
      <Artwork size={48} variant={index} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.sub} numberOfLines={1}>{track.artist}</Text>
      </View>
      <Text style={{ color: active ? C.purple : C.muted }}>{active ? '♫' : '•••'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  root: { flex: 1, backgroundColor: C.bg, overflow: 'hidden' },
  glowOne: { position: 'absolute', width: 260, height: 260, borderRadius: 180, backgroundColor: '#747B80', opacity: 0.18, top: 110, right: -120 },
  glowTwo: { position: 'absolute', width: 240, height: 240, borderRadius: 180, backgroundColor: '#454B50', opacity: 0.14, bottom: 90, left: -130 },
  header: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 27, fontWeight: '900', letterSpacing: 5, color: C.text },
  tagline: { color: C.muted, fontSize: 8, letterSpacing: 2.5, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 21, paddingBottom: 145, flexGrow: 1 },
  eyebrow: { color: '#AEB5B9', fontSize: 9, letterSpacing: 2.2, fontWeight: '700' },
  eyebrowPurple: { color: '#C1C6C9', fontSize: 9, letterSpacing: 2, fontWeight: '800' },
  heroTitle: { color: C.text, fontSize: 30, fontWeight: '800', marginTop: 8 },
  sub: { color: C.muted, fontSize: 12, marginTop: 4 },
  banner: { borderRadius: 22, padding: 20, marginTop: 22, minHeight: 155, overflow: 'hidden', justifyContent: 'center' },
  bannerTitle: { color: C.text, fontSize: 23, fontWeight: '800', marginTop: 9, lineHeight: 28 },
  bannerOrb: { position: 'absolute', width: 112, height: 112, borderRadius: 60, right: 10, top: 22, backgroundColor: '#70777B', opacity: 0.55, borderWidth: 17, borderColor: '#BFC4C7', shadowColor: '#AEB4B8', shadowOpacity: 0.8, shadowRadius: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 27, marginBottom: 11 },
  sectionTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
  mutedSmall: { color: C.muted, fontSize: 10 },
  emptyCard: { backgroundColor: C.panel, borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.line },
  emptyIcon: { color: C.purple, fontSize: 30, marginBottom: 5 },
  trackTitle: { color: C.text, fontSize: 13, fontWeight: '700' },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#FFFFFF0D' },
  art: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  artOrb: { backgroundColor: '#120E19', borderWidth: 5, borderColor: '#AEB4B8', opacity: 0.92, shadowColor: '#AEB4B8', shadowOpacity: 1, shadowRadius: 15 },
  artRing: { position: 'absolute', borderWidth: 1, borderColor: '#FFFFFF55' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 13, paddingBottom: Platform.OS === 'ios' ? 21 : 13, backgroundColor: '#101315F2', borderTopWidth: 1, borderTopColor: C.line },
  navItem: { alignItems: 'center', gap: 3, minWidth: 60 },
  navIcon: { color: C.muted, fontSize: 21 },
  navLabel: { color: C.muted, fontSize: 9 },
  navActive: { color: C.purple },
  miniPlayer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 76 : 68, left: 12, right: 12, height: 66, backgroundColor: '#202427EF', borderWidth: 1, borderColor: '#FFFFFF20', borderRadius: 17, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 8, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
  miniMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  miniControl: { width: 29, alignItems: 'center', justifyContent: 'center' },
  controlText: { color: C.text, fontSize: 18, fontWeight: '700' },
  fullPlayer: { ...StyleSheet.absoluteFillObject, zIndex: 20, backgroundColor: '#090B0CF7', paddingHorizontal: 23, paddingTop: Platform.OS === 'ios' ? 8 : 20, paddingBottom: 18 },
  fullTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 55 },
  closeButton: { width: 39, height: 39, borderRadius: 20, backgroundColor: '#FFFFFF10', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF16' },
  closeGlyph: { color: C.text, fontSize: 22 },
  fullTopTitle: { color: C.text, fontSize: 10, letterSpacing: 1.4, marginTop: 4, fontWeight: '700' },
  fullContent: { flex: 1, justifyContent: 'center', paddingBottom: 12 },
  bigArtworkWrap: { alignItems: 'center', marginBottom: 29 },
  songInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 25 },
  bigSongTitle: { color: C.text, fontSize: 22, fontWeight: '900' },
  heart: { color: C.purple, fontSize: 28, paddingHorizontal: 5 },
  progressArea: { marginBottom: 22 },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: '#FFFFFF25', overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#C6CBCF', borderRadius: 4 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  time: { color: C.muted, fontSize: 10, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
  sideControl: { color: '#AEB5B9', fontSize: 22 },
  skip: { color: C.text, fontSize: 24, fontWeight: '600' },
  playButton: { width: 65, height: 65, borderRadius: 34, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', shadowColor: '#AEB4B8', shadowOpacity: 0.5, shadowRadius: 17 },
  playGlyph: { color: '#1A1222', fontSize: 25, fontWeight: '900' },
  playerFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#FFFFFF12' },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  genreChip: { backgroundColor: '#202427', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: '#3A4145' },
  genreText: { color: '#D5D9DB', fontSize: 11, fontWeight: '700' },
  search: { marginTop: 18, marginBottom: 12, backgroundColor: C.panel, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13, color: C.text, borderWidth: 1, borderColor: C.line },
  importButton: { backgroundColor: '#252A2D', borderRadius: 14, padding: 14, marginVertical: 12, borderWidth: 1, borderColor: '#4A5155' },
  importText: { color: '#D5D9DB', fontWeight: '700', textAlign: 'center' },
  artistAvatar: { width:48,height:48,borderRadius:24,alignItems:'center',justifyContent:'center' },
  artistInitial: { color:'#F5EFFF',fontSize:20,fontWeight:'900' },
  artistHero: { alignItems:'center',paddingVertical:28,borderRadius:22,marginTop:12,borderWidth:1,borderColor:C.line },
  artistBigAvatar: { width:100,height:100,borderRadius:50,backgroundColor:'#626A6F',alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:'#AEB4B8' },
  artistBigInitial: { color:'#FFFFFF',fontSize:42,fontWeight:'900' },
  artistName: { color:C.text,fontSize:25,fontWeight:'900',marginTop:15 },
  backButton: { paddingVertical:12 },
});
