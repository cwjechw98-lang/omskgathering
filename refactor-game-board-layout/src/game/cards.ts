import { CardData } from './types';

export const ALL_CARDS: CardData[] = [
  // Lands
  { id: 'plains', name: 'Равнина', emoji: '🏔️', type: 'land', color: 'white', cost: 0, attack: 0, health: 0, description: '+1 мана', rarity: 'common', keywords: [] },
  { id: 'island', name: 'Остров', emoji: '🌊', type: 'land', color: 'blue', cost: 0, attack: 0, health: 0, description: '+1 мана', rarity: 'common', keywords: [] },
  { id: 'swamp', name: 'Болото', emoji: '🌑', type: 'land', color: 'black', cost: 0, attack: 0, health: 0, description: '+1 мана', rarity: 'common', keywords: [] },
  { id: 'mountain', name: 'Гора', emoji: '⛰️', type: 'land', color: 'red', cost: 0, attack: 0, health: 0, description: '+1 мана', rarity: 'common', keywords: [] },
  { id: 'forest', name: 'Лес', emoji: '🌲', type: 'land', color: 'green', cost: 0, attack: 0, health: 0, description: '+1 мана', rarity: 'common', keywords: [] },

  // White creatures
  { id: 'guard', name: 'Стражник', emoji: '🛡️', type: 'creature', color: 'white', cost: 2, attack: 1, health: 4, description: 'Защитник. Стойкий воин.', flavor: '«Во имя Омска!»', rarity: 'common', keywords: ['defender'] },
  { id: 'knight', name: 'Рыцарь', emoji: '⚔️', type: 'creature', color: 'white', cost: 3, attack: 3, health: 3, description: 'Бдительность. Верный воин.', flavor: '«За честь и славу!»', rarity: 'uncommon', keywords: ['vigilance'] },
  { id: 'angel', name: 'Ангел-хранитель', emoji: '👼', type: 'creature', color: 'white', cost: 5, attack: 4, health: 5, description: 'Полёт, привязка к жизни.', flavor: '«Свет не гаснет.»', rarity: 'rare', keywords: ['flying', 'lifelink'] },

  // Blue creatures
  { id: 'mage', name: 'Маг бури', emoji: '🧙', type: 'creature', color: 'blue', cost: 2, attack: 2, health: 2, description: 'Полёт. Ловкий заклинатель.', flavor: '«Ветер послушен мне.»', rarity: 'common', keywords: ['flying'] },
  { id: 'serpent', name: 'Морской змей', emoji: '🐍', type: 'creature', color: 'blue', cost: 4, attack: 3, health: 5, description: 'Порчеустойчивость. Древний зверь.', flavor: '«Глубины хранят тайны.»', rarity: 'uncommon', keywords: ['hexproof'] },
  { id: 'phantom', name: 'Фантом', emoji: '👻', type: 'creature', color: 'blue', cost: 3, attack: 2, health: 2, description: 'Неблокируемый. Призрачный шпион.', flavor: '«Ты меня не видишь.»', rarity: 'rare', keywords: ['unblockable'] },

  // Black creatures
  { id: 'zombie', name: 'Зомби', emoji: '🧟', type: 'creature', color: 'black', cost: 1, attack: 2, health: 1, description: 'Дешёвый и злой.', flavor: '«Мррр...»', rarity: 'common', keywords: [] },
  { id: 'vampire', name: 'Вампир', emoji: '🧛', type: 'creature', color: 'black', cost: 3, attack: 3, health: 2, description: 'Привязка к жизни. Смерт. касание.', flavor: '«Кровь — это жизнь.»', rarity: 'rare', keywords: ['lifelink', 'deathtouch'] },
  { id: 'reaper', name: 'Жнец душ', emoji: '💀', type: 'creature', color: 'black', cost: 5, attack: 5, health: 4, description: 'Смерт. касание. Ужас поля.', flavor: '«Время пришло.»', rarity: 'mythic', keywords: ['deathtouch'] },

  // Red creatures
  { id: 'goblin', name: 'Гоблин', emoji: '👺', type: 'creature', color: 'red', cost: 1, attack: 2, health: 1, description: 'Ускорение. Быстрый и дерзкий.', flavor: '«Первый удар — мой!»', rarity: 'common', keywords: ['haste'] },
  { id: 'berserker', name: 'Берсерк', emoji: '🪓', type: 'creature', color: 'red', cost: 3, attack: 4, health: 2, description: 'Ускорение, первый удар.', flavor: '«Ярость!»', rarity: 'uncommon', keywords: ['haste', 'first_strike'] },
  { id: 'dragon', name: 'Дракон', emoji: '🐉', type: 'creature', color: 'red', cost: 6, attack: 6, health: 5, description: 'Полёт, растоптать. Огненный ужас.', flavor: '«Небо горит!»', rarity: 'mythic', keywords: ['flying', 'trample'] },

  // Green creatures
  { id: 'wolf', name: 'Волк', emoji: '🐺', type: 'creature', color: 'green', cost: 2, attack: 3, health: 2, description: 'Сильный и быстрый зверь.', rarity: 'common', keywords: [] },
  { id: 'bear', name: 'Медведь', emoji: '🐻', type: 'creature', color: 'green', cost: 3, attack: 3, health: 4, description: 'Растоптать. Сила природы.', flavor: '«Лес не прощает.»', rarity: 'uncommon', keywords: ['trample'] },
  { id: 'treant', name: 'Древень', emoji: '🌳', type: 'creature', color: 'green', cost: 5, attack: 5, health: 7, description: 'Растоптать. Древний страж.', flavor: '«Я корни мира.»', rarity: 'rare', keywords: ['trample'] },

  // Spells
  { id: 'bolt', name: 'Молния', emoji: '⚡', type: 'spell', color: 'red', cost: 1, attack: 3, health: 0, description: 'Наносит 3 урона существу.', rarity: 'common', keywords: [] },
  { id: 'heal', name: 'Исцеление', emoji: '💚', type: 'spell', color: 'white', cost: 2, attack: 0, health: 4, description: 'Восстанавливает 4 здоровья герою.', rarity: 'common', keywords: [] },

  // Enchantments
  { id: 'shield_aura', name: 'Аура щита', emoji: '🔮', type: 'enchantment', color: 'white', cost: 3, attack: 0, health: 0, description: 'Все ваши существа +0/+1.', rarity: 'uncommon', keywords: [] },
  { id: 'war_drums', name: 'Боевые барабаны', emoji: '🥁', type: 'enchantment', color: 'red', cost: 3, attack: 0, health: 0, description: 'Все ваши существа +1/+0.', rarity: 'uncommon', keywords: [] },
];

export function getCardById(id: string): CardData | undefined {
  return ALL_CARDS.find(c => c.id === id);
}
