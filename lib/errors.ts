import {tr} from './i18n';

export function getError(e:unknown){
 const message=e instanceof Error?e.message:e&&typeof e==='object'&&'message' in e&&typeof e.message==='string'?e.message:tr('操作失败，请检查网络后重试。','Something went wrong. Check your connection and try again.');
 if(message.includes('already linked to a family')||message.includes('family_members_one_family_per_user_idx'))return tr('此账号已经绑定了一个家庭。','This account is already linked to a family.');
 if(message.includes('Family code is invalid'))return tr('家庭编码无效，请向家庭成员确认后重试。','Invalid family code. Check it with your family and try again.');
 if(message.includes('Invite is invalid or expired'))return tr('邀请链接无效或已过期。','This invite link is invalid or has expired.');
 if(message.includes('Cannot coerce the result to a single JSON object'))return tr('这条记录可能已被其他家人删除，请刷新后再试。','This record may have been deleted by someone else. Refresh and try again.');
 return message;
}
