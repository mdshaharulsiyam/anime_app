import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimeCarousel } from '../../components/AnimeCarousel';
import { Loading, Pill, ScoreBadge } from '../../components/ui';
import { colors, font, radius, spacing } from '../../constants/theme';
import { coverImage, jikan } from '../../lib/api';
import { CATEGORIES } from '../../lib/catalog';
import { useAsync } from '../../lib/hooks';
import { Anime } from '../../lib/types';

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_W = SCREEN_W - spacing.lg * 2;

// Discover rails, in display order. Each links to its full "View all" list.
const RAILS = [
  CATEGORIES.top,
  CATEGORIES.popular,
  CATEGORIES.airing,
  CATEGORIES.favorite,
  CATEGORIES.upcoming,
];

function HeroCard({ anime }: { anime: Anime }) {
  return (
    <Link href={`/anime/${anime.mal_id}`} asChild>
      <Pressable style={styles.hero}>
        <Image
          source={{ uri: coverImage(anime.images) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
        />
        <View style={styles.heroShade} />
        <View style={styles.heroContent}>
          <View style={styles.heroTopRow}>
            <View style={styles.featuredTag}>
              <Ionicons name="flame" size={12} color={colors.text} />
              <Text style={styles.featuredTagText}>FEATURED</Text>
            </View>
            <ScoreBadge score={anime.score} />
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {anime.title_english || anime.title}
          </Text>
          <View style={styles.heroPills}>
            {anime.genres?.slice(0, 3).map((g) => (
              <Pill key={g.mal_id} label={g.name} tint={colors.accent} />
            ))}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function Hero() {
  const { data, loading } = useAsync(() => jikan.topAnime(1, 'airing'), []);
  if (loading) {
    return (
      <View style={[styles.heroLoading]}>
        <Loading />
      </View>
    );
  }
  const items = (data?.data ?? []).slice(0, 6);
  return (
    <FlatList
      data={items}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      snapToInterval={HERO_W + spacing.md}
      decelerationRate="fast"
      keyExtractor={(i) => String(i.mal_id)}
      contentContainerStyle={{ paddingHorizontal: spacing.lg }}
      renderItem={({ item }) => (
        <View style={{ width: HERO_W, marginRight: spacing.md }}>
          <HeroCard anime={item} />
        </View>
      )}
    />
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>
            Shiori<Text style={{ color: colors.primary }}> Anime</Text>
          </Text>
          <Text style={styles.brandSub}>Powered by MyAnimeList · Jikan API</Text>
        </View>
        <Link href="/search" asChild>
          <Pressable style={styles.searchBtn} hitSlop={8}>
            <Ionicons name="search" size={20} color={colors.text} />
          </Pressable>
        </Link>
      </View>

      <Hero />

      {RAILS.map((cat) => (
        <AnimeCarousel
          key={cat.key}
          title={cat.title}
          subtitle={cat.subtitle}
          categoryKey={cat.key}
          fetcher={() => cat.fetcher(1)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  brand: { color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy },
  brandSub: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLoading: { height: HERO_W * 0.62, marginHorizontal: spacing.lg },
  hero: {
    width: '100%',
    height: HERO_W * 0.62,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.card,
    justifyContent: 'flex-end',
  },
  heroShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7,10,20,0.35)',
  },
  heroContent: { padding: spacing.lg, gap: spacing.sm },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  featuredTagText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: font.weight.heavy,
    letterSpacing: 1,
  },
  heroTitle: {
    color: colors.text,
    fontSize: font.size.xl,
    fontWeight: font.weight.heavy,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
  },
  heroPills: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
