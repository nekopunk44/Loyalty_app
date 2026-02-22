import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  FlatList,
  Dimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { ProductCard } from '../components/Cards';
import { FadeInCard, ScaleInCard } from '../components/AnimatedCard';

const mockProducts = [
  {
    id: 1,
    name: 'Кофе премиум',
    description: 'Высокорядные зёрна',
    price: 450,
    originalPrice: 500,
    discount: 10,
  },
  {
    id: 2,
    name: 'Шоколад',
    description: 'Бельгийский',
    price: 350,
    discount: 0,
  },
  {
    id: 3,
    name: 'Чай зелёный',
    description: 'Естественный вкус',
    price: 280,
    originalPrice: 320,
    discount: 15,
  },
  {
    id: 4,
    name: 'Мёд натуральный',
    description: 'Первого сорта',
    price: 520,
    discount: 0,
  },
  {
    id: 5,
    name: 'Печенье',
    description: 'Домашнее',
    price: 180,
    originalPrice: 200,
    discount: 10,
  },
  {
    id: 6,
    name: 'Крем для лица',
    description: 'Натуральный',
    price: 1200,
    originalPrice: 1500,
    discount: 20,
  },
];

export default function ShopScreen() {
  const [amount, setAmount] = useState('');
  const [showProducts, setShowProducts] = useState(false);

  const handlePurchase = () => {
    const sum = parseFloat(amount);
    if (!sum || sum <= 0) {
      Alert.alert('❌ Ошибка', 'Введите корректную сумму покупки');
      return;
    }
    const cashback = (sum * 0.01).toFixed(2);
    Alert.alert(
      '✅ Покупка успешна!',
      `Сумма: ${sum.toFixed(2)} PRB\nКешбек: +${cashback} PRB\n\nСпасибо за покупку! 🎉`
    );
    setAmount('');
  };

  const handleAddToCart = (product) => {
    Alert.alert('✅ Товар добавлен', `${product.name} добавлен в корзину`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Раздел оформления покупки */}
      <ScaleInCard delay={100} style={{ marginBottom: spacing.lg }}>
        <View style={styles.card}>
          <MaterialIcons name="shopping-cart" size={40} color={colors.primary} />
          <Text style={styles.title}>Оформить покупку</Text>
          <Text style={styles.subtitle}>Введите сумму для получения кешбека</Text>
        </View>
      </ScaleInCard>

      <FadeInCard delay={200} style={{ marginBottom: spacing.lg }}>
        <View style={styles.inputContainer}>
          <MaterialIcons
            name="attach-money"
            size={24}
            color={colors.primary}
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            placeholder="Введите сумму, PRB"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </FadeInCard>

      <FadeInCard delay={250} style={{ marginBottom: spacing.lg }}>
        <View style={styles.infoCard}>
          <MaterialIcons name="lightbulb-outline" size={24} color={colors.accent} />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Вы получите</Text>
            <Text style={styles.infoValue}>
              {amount ? `${(parseFloat(amount) * 0.01).toFixed(2)} PRB` : '—'} кешбека
            </Text>
          </View>
        </View>
      </FadeInCard>

      <FadeInCard delay={300}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handlePurchase}
        >
          <MaterialIcons name="payment" size={20} color="#fff" />
          <Text style={styles.buttonText}>Оплатить</Text>
        </TouchableOpacity>
      </FadeInCard>

      {/* Раздел каталога товаров */}
      <View style={styles.divider} />

      <ScaleInCard delay={350} style={{ marginVertical: spacing.lg }}>
        <TouchableOpacity
          style={styles.catalogHeader}
          onPress={() => setShowProducts(!showProducts)}
        >
          <View style={styles.catalogTitleContainer}>
            <MaterialIcons name="storefront" size={24} color={colors.primary} />
            <Text style={styles.catalogTitle}>Каталог товаров</Text>
          </View>
          <MaterialIcons
            name={showProducts ? 'expand-less' : 'expand-more'}
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </ScaleInCard>

      {/* Сетка товаров */}
      {showProducts && (
        <View style={styles.productsGrid}>
          <FlatList
            data={mockProducts}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <FadeInCard delay={400 + index * 50}>
                <ProductCard
                  product={item}
                  onPress={() => Alert.alert(item.name, item.description)}
                  onAddToCart={handleAddToCart}
                />
              </FadeInCard>
            )}
            keyExtractor={(item) => item.id.toString()}
          />
        </View>
      )}

      {/* Преимущества программы */}
      <View style={styles.benefitsCard}>
        <Text style={styles.benefitsTitle}>Преимущества</Text>
        <View style={styles.benefit}>
          <Text style={styles.benefitIcon}>✓</Text>
          <Text style={styles.benefitText}>1% кешбека за каждую покупку</Text>
        </View>
        <View style={styles.benefit}>
          <Text style={styles.benefitIcon}>✓</Text>
          <Text style={styles.benefitText}>Используйте бонусы при оплате</Text>
        </View>
        <View style={styles.benefit}>
          <Text style={styles.benefitIcon}>✓</Text>
          <Text style={styles.benefitText}>Участие в аукционах и событиях</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.cardBg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  infoText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 4,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  catalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  catalogTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catalogTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: spacing.m,
  },
  productsGrid: {
    marginBottom: spacing.lg,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  benefitsCard: {
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  benefit: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  benefitIcon: {
    fontSize: 18,
    color: colors.success,
    marginRight: spacing.sm,
    fontWeight: '700',
  },
  benefitText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
});

